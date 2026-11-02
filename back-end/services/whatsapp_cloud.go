package services

// Envio pela API Oficial do WhatsApp (Cloud API) passando pelo n8n.
//
// O backend monta a mensagem no formato da Meta e manda para o webhook do n8n.
// O n8n (fluxo "JU - Enviar API Oficial") repassa para a Graph API com o token
// guardado na credencial dele e devolve: {"status": <http da Meta>, "meta": <resposta da Meta>}.
//
// Regras da Meta:
//   - Dentro da janela de 24h (última mensagem do cidadão) -> texto livre  (EnviarTextoMeta)
//   - Fora da janela -> só mensagem modelo aprovada                       (EnviarTemplateMeta)
//
// Dois modos, conforme o .env:
//   - WEBHOOK_META_ENVIAR preenchido: usa o fluxo novo "JU - Enviar API Oficial"
//     (texto livre de verdade e resposta da Meta de volta para o painel).
//   - WEBHOOK_META_ENVIAR vazio: usa o n8n atual SEM ALTERAR, pelo webhook
//     WEBHOOK_ENVIAR_MENSAGEM -> nó "Envia Mensagem" -> modelo template_utility
//     (parâmetros "status" e "texto"). O status vem de STATUS_MENSAGEM_ASSESSOR
//     (padrão "Atendimento"). Nesse modo o n8n responde antes de enviar, então o
//     painel não fica sabendo se a Meta recusou: conferir nas execuções do n8n.

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"

	"back-end/config"
)

// Códigos de erro da Meta que significam "janela de 24h fechada".
var codigosJanelaFechada = map[int]bool{
	131047: true, // Re-engagement message: mais de 24h desde a última resposta do usuário
}

// ErrJanelaFechada é devolvido quando a Meta recusa texto livre por estar fora da janela de 24h.
var ErrJanelaFechada = errors.New("janela de 24h fechada: só é permitido enviar mensagem modelo")

// MetaError representa o erro devolvido pela Graph API.
type MetaError struct {
	Status  int
	Code    int
	Message string
	Details string
}

func (e *MetaError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("meta %d (código %d): %s - %s", e.Status, e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("meta %d (código %d): %s", e.Status, e.Code, e.Message)
}

func (e *MetaError) Unwrap() error {
	if codigosJanelaFechada[e.Code] {
		return ErrJanelaFechada
	}
	return nil
}

// O n8n espera a resposta da Meta antes de responder, por isso o timeout é maior.
var n8nClient = &http.Client{Timeout: 30 * time.Second}

// NormalizarTelefoneMeta deixa só os dígitos (a Cloud API não aceita "@s.whatsapp.net" nem "@lid").
func NormalizarTelefoneMeta(telefone string) string {
	if i := strings.IndexAny(telefone, "@:"); i >= 0 {
		telefone = telefone[:i]
	}
	var b strings.Builder
	for _, r := range telefone {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// RespostaEnvioMeta traz o id (wamid) da mensagem aceita pela Meta.
type RespostaEnvioMeta struct {
	Messages []struct {
		ID string `json:"id"`
	} `json:"messages"`
}

func (r *RespostaEnvioMeta) WamID() string {
	if r == nil || len(r.Messages) == 0 {
		return ""
	}
	return r.Messages[0].ID
}

// respostaN8N é o que o fluxo do n8n devolve no "Respond to Webhook".
type respostaN8N struct {
	Status *int            `json:"status"`
	Meta   json.RawMessage `json:"meta"`
}

func enviarViaN8N(payload map[string]any) (*RespostaEnvioMeta, error) {
	webhook := strings.TrimSpace(os.Getenv("WEBHOOK_META_ENVIAR"))
	if webhook == "" {
		return nil, errors.New("WEBHOOK_META_ENVIAR não configurado no .env")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(http.MethodPost, webhook, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := n8nClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("falha ao falar com o n8n: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("n8n respondeu %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}

	var r respostaN8N
	if err := json.Unmarshal(raw, &r); err != nil || r.Status == nil {
		// Sem "status" = o webhook respondeu antes de enviar (ex.: "Workflow was started").
		// Não dá para saber se a Meta aceitou, então não marcamos como enviado.
		return nil, errors.New("o n8n não devolveu a resposta da Meta: confira se o webhook está em \"Respond to Webhook\"")
	}

	if *r.Status < 200 || *r.Status >= 300 {
		var envelope struct {
			Error struct {
				Code      int    `json:"code"`
				Message   string `json:"message"`
				ErrorData struct {
					Details string `json:"details"`
				} `json:"error_data"`
			} `json:"error"`
		}
		_ = json.Unmarshal(r.Meta, &envelope)
		return nil, &MetaError{
			Status:  *r.Status,
			Code:    envelope.Error.Code,
			Message: envelope.Error.Message,
			Details: envelope.Error.ErrorData.Details,
		}
	}

	var out RespostaEnvioMeta
	_ = json.Unmarshal(r.Meta, &out)
	return &out, nil
}

// UsaN8NAtual indica o modo "n8n sem alteração" (template_utility).
func UsaN8NAtual() bool {
	return strings.TrimSpace(os.Getenv("WEBHOOK_META_ENVIAR")) == ""
}

var espacosRepetidos = regexp.MustCompile(` {4,}`)

// TextoParaVariavelTemplate adapta o texto para caber numa variável de modelo da Meta
// e no JSON montado pelo nó "Envia Mensagem" do n8n:
//   - a Meta recusa variável com quebra de linha, tab ou 4+ espaços seguidos (erro 132018)
//   - o nó do n8n cola o texto dentro de aspas no JSON, então aspas e barras quebrariam o envio
func TextoParaVariavelTemplate(texto string) string {
	texto = strings.NewReplacer("\r\n", " ", "\n", " ", "\r", " ", "\t", " ", "\"", "'", "\\", "/").Replace(texto)
	texto = espacosRepetidos.ReplaceAllString(texto, "   ")
	return strings.TrimSpace(texto)
}

// EnviarTextoMeta envia a mensagem do assessor. Só é chamado com a janela de 24h aberta.
func EnviarTextoMeta(telefone, texto string) (*RespostaEnvioMeta, error) {
	if UsaN8NAtual() {
		status := strings.TrimSpace(os.Getenv("STATUS_MENSAGEM_ASSESSOR"))
		if status == "" {
			status = "Atendimento"
		}
		if err := config.EnviarMensagem(NormalizarTelefoneMeta(telefone), TextoParaVariavelTemplate(texto), status); err != nil {
			return nil, fmt.Errorf("falha ao chamar o webhook do n8n: %w", err)
		}
		return &RespostaEnvioMeta{}, nil
	}
	return enviarViaN8N(map[string]any{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                NormalizarTelefoneMeta(telefone),
		"type":              "text",
		"text": map[string]any{
			"preview_url": true,
			"body":        texto,
		},
	})
}

// EnviarTemplateMeta envia uma mensagem modelo aprovada.
// parametrosCorpo preenche {{1}}, {{2}}... do corpo, na ordem. Pode ser vazio.
func EnviarTemplateMeta(telefone, nomeTemplate, idioma string, parametrosCorpo []string) (*RespostaEnvioMeta, error) {
	template := map[string]any{
		"name":     nomeTemplate,
		"language": map[string]any{"code": idioma},
	}
	if len(parametrosCorpo) > 0 {
		params := make([]map[string]any, 0, len(parametrosCorpo))
		for _, p := range parametrosCorpo {
			params = append(params, map[string]any{"type": "text", "text": p})
		}
		template["components"] = []map[string]any{{"type": "body", "parameters": params}}
	}
	return enviarViaN8N(map[string]any{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                NormalizarTelefoneMeta(telefone),
		"type":              "template",
		"template":          template,
	})
}
