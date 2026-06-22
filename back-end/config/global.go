package config

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"github.com/jmoiron/sqlx"
)

var planos = map[string]int{"bronze": 200, "prata": 1000, "ouro": 5000}

var Mensagem string
var Respondendo bool
var Counter int

var vendedorCounter uint64

func TelefoneVendedores() string {
	raw := os.Getenv("TELEFONE_VENDEDORES")
	parts := strings.Split(raw, ",")
	var telefones []string
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			telefones = append(telefones, t)
		}
	}
	if len(telefones) == 0 {
		return ""
	}
	idx := atomic.AddUint64(&vendedorCounter, 1) - 1
	return telefones[idx%uint64(len(telefones))]
}

const (
	plano_atual = "ouro"
)

func GetPlanoAtual() int {
	return planos[plano_atual]
}

func PadronizaTelefone(telefone string) string {
	if len(telefone) > 13 && !strings.HasSuffix(telefone, "@lid") {
		telefone += "@lid"
	} else if !strings.HasSuffix(telefone, "@s.whatsapp.net") && !strings.HasSuffix(telefone, "@lid") {
		telefone += "@s.whatsapp.net"
	}
	return telefone
}

func EnviarMensagem(telefone, mensagem string) error {
	baseURL := os.Getenv("WEBHOOK_ENVIAR_MENSAGEM")
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	data := url.Values{}
	data.Set("mensagem", mensagem)
	data.Set("telefone", telefone)
	data.Set("instance", "ouvidoria_clara_jussara")

	req, err := http.NewRequest("POST", baseURL, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("erro ao enviar requisição: %s", resp.Status)
	}
	return nil
}

func EnviarMensagemChat(telefone, mensagem string) error {
	baseURL := os.Getenv("WEBHOOK_ENVIAR_MENSAGEM_CHAT")
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	data := url.Values{}
	data.Set("conteudo", mensagem)
	data.Set("telefoneCliente", telefone)
	data.Set("telefoneAgente", os.Getenv("TELEFONE_AGENTE"))

	req, err := http.NewRequest("POST", baseURL, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("erro ao enviar requisição: %s", resp.Status)
	}
	return nil
}

func FormatarTelefone(tel string) string {
	// remove prefixo 55 se vier com 13 dígitos
	if len(tel) == 13 && tel[:2] == "55" {
		tel = tel[2:]
	}

	if len(tel) == 11 {
		return fmt.Sprintf("(%s) %s%s-%s",
			tel[0:2], tel[2:3], tel[3:7], tel[7:])
	}

	return tel
}

func CheckInativos1Day(db *sqlx.DB) {
	for {
		const query = `
			SELECT a.telefone FROM atividade_clientes a
			LEFT JOIN reclamacao i ON i.telefone = a.telefone
			WHERE a.lembrete_1day = false
			AND i.idreclamacao IS NULL
			AND a.ultima_interacao < NOW() - INTERVAL '23 hours';
			`

		var telefonesInativo []string
		err := db.Select(&telefonesInativo, query)
		if err != nil {
			fmt.Println("Erro ao buscar telefones inativos:", err)
			time.Sleep(1 * time.Minute) // Espera 1 minuto antes de rodar novamente
			continue
		}

		for _, tel := range telefonesInativo {
			msg := "📢 Olá!\n"
			msg += "Seu atendimento ainda está em aberto há quase 24 horas. Aguardamos sua resposta para dar continuidade à solicitação. Obrigada 😊"
			telPadronizado := PadronizaTelefone(tel)
			err := EnviarMensagem(telPadronizado, msg)
			if err != nil {
				fmt.Println("Erro ao enviar notificação para ", telPadronizado, ":", err)
				continue
			} else {
				// Atualiza o lembrete para true
				const updateQuery = `
					UPDATE atividade_clientes
					SET lembrete_1day = true
					WHERE telefone = $1;`
				_, err := db.Exec(updateQuery, tel)
				if err != nil {
					fmt.Println("Erro ao atualizar lembrete para ", tel, ":", err)
				}
			}
		}
		time.Sleep(1 * time.Minute) // Espera 1 minuto antes de rodar novamente
	}
}

func CheckInativos10Min(db *sqlx.DB) {
	for {
		const query = `
			SELECT a.telefone FROM atividade_clientes a
			LEFT JOIN reclamacao i ON i.telefone = a.telefone
			WHERE a.lembrete_10min = false
			AND i.idreclamacao IS NULL
			AND a.ultima_interacao < NOW() - INTERVAL '10 minutes';
			`

		var telefonesInativo []string
		err := db.Select(&telefonesInativo, query)
		if err != nil {
			fmt.Println("Erro ao buscar telefones inativos:", err)
			time.Sleep(1 * time.Minute) // Espera 1 minuto antes de rodar novamente
			continue
		}

		for _, tel := range telefonesInativo {
			msg := "📢 Olá!\n"
			msg += "Seu atendimento ainda está em aberto. Aguardamos sua resposta para dar continuidade à solicitação. Obrigada 😊"
			telPadronizado := PadronizaTelefone(tel)
			err := EnviarMensagem(telPadronizado, msg)
			if err != nil {
				fmt.Println("Erro ao enviar notificação para ", telPadronizado, ":", err)
				continue
			} else {
				// Atualiza o lembrete para true
				const updateQuery = `
					UPDATE atividade_clientes
					SET lembrete_10min = true
					WHERE telefone = $1;`
				_, err := db.Exec(updateQuery, tel)
				if err != nil {
					fmt.Println("Erro ao atualizar lembrete para ", tel, ":", err)
				}
			}
		}
		time.Sleep(1 * time.Minute) // Espera 1 minuto antes de rodar novamente
	}
}

func FormataValor(valor int) float64 {
	return float64(valor)
}

func EnviarRelatorio(telefone, mensagem string) error {
	baseURL := os.Getenv("WEBHOOK_ENVIAR_RELATORIO")
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	data := url.Values{}
	data.Set("mensagem", mensagem)
	data.Set("telefone", telefone)
	data.Set("instance", "relatorioDarwin")

	req, err := http.NewRequest("POST", baseURL, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("erro ao enviar requisição: %s", resp.Status)
	}
	return nil
}
