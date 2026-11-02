package usecases

import (
	"back-end/config"
	"back-end/models"
	"back-end/repository"
	"back-end/services"
	"back-end/utils"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const debounceTimeout = 15 * time.Second // tempo de espera para agrupar mensagens

type pendingMessage struct {
	mensagens        []string
	timer            *time.Timer
	contato          *models.Contato
	instance         string
	somenteHistorico bool
}

type MensagemUseCase struct {
	repo    repository.MensagemRepo
	pending map[string]*pendingMessage // mapa de telefone -> mensagens pendentes
	mu      sync.Mutex
}

func NewMensagemUseCase(repo repository.MensagemRepo) *MensagemUseCase {
	return &MensagemUseCase{
		repo:    repo,
		pending: make(map[string]*pendingMessage),
	}
}

func (u *MensagemUseCase) Responder(telefone string) error {
	fmt.Printf("[RESPONDER] Iniciando processo de responder para telefone: %s\n", telefone)

	baseURL := os.Getenv("WEBHOOK_RESPONDER")
	client := &http.Client{Timeout: time.Second * 10}

	data := url.Values{}
	contato, err := u.repo.GetContatoByTelefone(telefone)
	if err != nil {
		fmt.Printf("[RESPONDER] Erro ao obter instance: %v\n", err)
		return err
	}
	telefonePadronizado := u.padronizaTelefone(telefone)
	data.Set("telefone", telefone)
	data.Set("telefonePadronizado", telefonePadronizado)
	data.Set("instance", *contato.Instance)

	fmt.Printf("[RESPONDER] Enviando para webhook: %s\n", baseURL)

	req, err := http.NewRequest("POST", baseURL, strings.NewReader(data.Encode()))
	if err != nil {
		fmt.Printf("[RESPONDER] Erro ao criar request: %v\n", err)
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[RESPONDER] Erro ao enviar request: %v\n", err)
		return err
	}
	defer resp.Body.Close()

	fmt.Printf("[RESPONDER] Webhook retornou código: %d (%s)\n", resp.StatusCode, resp.Status)

	// Aceita qualquer código 2xx como sucesso
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		fmt.Printf("[RESPONDER] Webhook falhou com código: %d\n", resp.StatusCode)
		return fmt.Errorf("erro ao enviar requisição: %s", resp.Status)
	}
	return nil
}

func (u *MensagemUseCase) DeleteMensagens(telefone string) error {
	//Deletar as mensagens
	err := u.repo.DeleteMensagens(telefone)
	if err != nil {
		return err
	}
	//Verificar se tem novas mensagens
	count, err := u.repo.GetCountMensagens(telefone)
	if err != nil {
		return err
	}

	//Se tiver, chamar o Responder
	if count > 0 {
		return u.Responder(telefone)
	}

	return nil
}

func (u *MensagemUseCase) GetMensagens(telefone string) (*string, error) {
	mensagens, err := u.repo.GetMensagensNaoEnviadasBytelefone(telefone)
	if err != nil {
		return nil, err
	}
	var mensagemFinal string
	for _, mensagem := range mensagens {
		mensagemFinal += mensagem.Conteudo + "\n"
		err := u.repo.SetFoiEnviado(mensagem.ID)
		if err != nil {
			return nil, err
		}
	}

	msgRetorno := fmt.Sprintf(`{"data_atual": "%s", "dia_semana": "%s", "telefone_cliente": "%s", "mensagem": "%s"}`, time.Now().Format("2006-01-02"), time.Now().Format("Monday"), telefone, mensagemFinal)

	return &msgRetorno, nil
}

func (u *MensagemUseCase) AddMensagem(addMensagem *models.AddMensagem) error {
	//verificar se o contato existe
	contato, err := u.repo.GetContatoByTelefone(addMensagem.Telefone)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			campanha := u.buscarCampanhaNaMensagem(addMensagem.Conteudo)
			c := "ju"
			if campanha == nil {
				campanha = &c
			}
			err := u.repo.CreateContato(&models.Contato{
				Telefone: addMensagem.Telefone,
				Nome:     &addMensagem.Nome,
				Instance: &addMensagem.Instance,
				Campanha: campanha,
			})
			if err != nil {
				return fmt.Errorf("erro ao criar contato: %w", err)
			}
			// buscar o contato recem criado
			contato, err = u.repo.GetContatoByTelefone(addMensagem.Telefone)
			if err != nil {
				return fmt.Errorf("erro ao buscar contato recem criado: %w", err)
			}
		} else {
			return fmt.Errorf("erro ao verificar contato: %w", err)
		}
	}
	//verificar se o contato esta ativo
	// if contato.Ativo == false {
	// 	return fmt.Errorf("contato bloqueado")
	// }
	bloqueado := false
	err = u.repo.GetClienteBloqueadoById(contato.Telefone)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
	} else {
		bloqueado = true
	}
	// contato bloqueado: apenas registra o histórico, sem acionar a IA
	if bloqueado {
		u.addToPending(addMensagem.Telefone, addMensagem.Conteudo, contato, addMensagem.Instance, true)
		return nil
	}
	countContatos, err := u.repo.GetCountContatos()
	if err != nil {
		return fmt.Errorf("erro ao contar contatos: %w", err)
	}
	planoAtual := config.GetPlanoAtual()
	if countContatos > planoAtual {
		avisoPlano, err := u.repo.GetAvisoPlano()
		if err != nil {
			return fmt.Errorf("erro ao verificar aviso de plano: %w", err)
		}
		if !avisoPlano.Avisado {
			//enviar msg para o Ricardo e Leo
			mensagem := "🚨*LIMITE DE CONTATOS ATINGIDO*🚨\n"
			mensagem += fmt.Sprintf("- instancia: %s\n", addMensagem.Instance)
			mensagem += fmt.Sprintf("- contatos: %d\n", countContatos)
			mensagem += fmt.Sprintf("- plano: %d", planoAtual)
			err := config.EnviarMensagem(avisoPlano.TelefoneRicardo, mensagem, "Limite Plano")
			if err != nil {
				return fmt.Errorf("erro ao enviar mensagem de plano atingido: %w", err)
			}
			err = config.EnviarMensagem(avisoPlano.TelefoneLeo, mensagem, "Limite Plano")
			if err != nil {
				return fmt.Errorf("erro ao enviar mensagem de plano atingido: %w", err)
			}
			err = u.repo.SetAvisado()
			if err != nil {
				return fmt.Errorf("erro ao atualizar aviso de plano: %w", err)
			}
		}
	}

	if addMensagem.Instance != *contato.Instance {
		err := u.repo.UpdateInstanciaContato(addMensagem.Telefone, addMensagem.Instance)
		if err != nil {
			return fmt.Errorf("erro ao atualizar instancia do contato: %w", err)
		}
	}

	// adicionar mensagem ao debounce
	u.addToPending(addMensagem.Telefone, addMensagem.Conteudo, contato, addMensagem.Instance, false)

	return nil
}

func (u *MensagemUseCase) padronizaTelefone(telefone string) string {
	if len(telefone) > 13 && !strings.HasSuffix(telefone, "@lid") {
		telefone += "@lid"
	} else if !strings.HasSuffix(telefone, "@s.whatsapp.net") && !strings.HasSuffix(telefone, "@lid") {
		telefone += "@s.whatsapp.net"
	}
	return telefone
}

func (u *MensagemUseCase) buscarCampanhaNaMensagem(conteudo string) *string {
	msgLimpa := utils.RemoveAcento(strings.ToLower(strings.TrimSpace(conteudo)))
	campanhas, err := u.repo.GetAllCampanhas()
	if err != nil {
		return nil
	}
	for _, c := range campanhas {
		if c.PalavraChave != "" && strings.Contains(msgLimpa, c.PalavraChave) {
			palavra := c.PalavraChave
			return &palavra
		}
	}
	return nil
}

// addToPending adiciona uma mensagem à fila de pendentes e gerencia o timer
func (u *MensagemUseCase) addToPending(telefone, conteudo string, contato *models.Contato, instance string, somenteHistorico bool) {
	u.mu.Lock()
	defer u.mu.Unlock()

	if p, exists := u.pending[telefone]; exists {
		// já existe mensagem pendente, adiciona e reseta o timer
		p.mensagens = append(p.mensagens, conteudo)
		p.somenteHistorico = somenteHistorico
		p.timer.Reset(debounceTimeout)
	} else {
		// primeira mensagem, cria novo registro pendente
		p := &pendingMessage{
			mensagens:        []string{conteudo},
			contato:          contato,
			instance:         instance,
			somenteHistorico: somenteHistorico,
		}
		p.timer = time.AfterFunc(debounceTimeout, func() {
			u.processPending(telefone)
		})
		u.pending[telefone] = p
	}
	// atualizar a ultima interacao do contato
	go func() {
		err := u.repo.UpdateUltimaInteracao(telefone)
		if err != nil {
			fmt.Println("Erro ao atualizar ultima interacao: ", err)
			return
		}
	}()
}

// processPending processa todas as mensagens pendentes de um telefone
func (u *MensagemUseCase) processPending(telefone string) {
	u.mu.Lock()
	p, exists := u.pending[telefone]
	if !exists {
		u.mu.Unlock()
		return
	}
	// remove do mapa antes de processar
	delete(u.pending, telefone)
	u.mu.Unlock()

	// concatena todas as mensagens
	conteudoFinal := strings.Join(p.mensagens, " ")

	if p.somenteHistorico {
		if err := u.SalvarMensagemCliente(telefone, conteudoFinal); err != nil {
			fmt.Println("Erro ao salvar historico cliente: ", err)
		}
		return
	}

	// criar a mensagem
	mensagem := models.Mensagem{
		Telefone: p.contato.Telefone,
		Conteudo: conteudoFinal,
	}

	err := u.repo.CreateMensagem(&mensagem)
	if err != nil {

		fmt.Println("Erro ao criar mensagem: ", err)
		return
	}
	if err := u.SalvarMensagemCliente(telefone, conteudoFinal); err != nil {
		fmt.Println("Erro ao salvar historico cliente: ", err)
	}
	err = u.Responder(telefone)
	if err != nil {
		fmt.Println("Erro ao responder: ", err)
		return
	}

}

var localizacaoBrasil = func() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return time.FixedZone("-03", -3*60*60)
	}
	return loc
}()

func comHorarioLocal(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), localizacaoBrasil)
}

func (u *MensagemUseCase) SalvarMensagemCliente(telefone, conteudo string) error {
	return u.repo.CreateHistoricoChat(&models.HistoricoChat{
		Telefone:  telefone,
		Remetente: "cliente",
		Conteudo:  strings.TrimSpace(conteudo),
		Tipo:      "texto",
	})
}

func (u *MensagemUseCase) SalvarMensagemIA(telefone, conteudo string) error {
	return u.repo.CreateHistoricoChat(&models.HistoricoChat{
		Telefone:  telefone,
		Remetente: "ia",
		Conteudo:  strings.TrimSpace(conteudo),
		Tipo:      "texto",
	})
}

// margem de segurança: a janela é tratada como fechada 10 min antes das 24h
const margemJanelaMinutos = 10

// GetJanela informa se a janela de 24h da Meta está aberta para o contato.
func (u *MensagemUseCase) GetJanela(telefone string) (models.JanelaAtendimento, error) {
	segundos, err := u.repo.GetSegundosRestantesJanela(telefone, margemJanelaMinutos)
	if err != nil {
		return models.JanelaAtendimento{}, err
	}
	if segundos < 0 {
		segundos = 0
	}
	return models.JanelaAtendimento{Aberta: segundos > 0, SegundosRestantes: segundos}, nil
}

// EnviarMensagemAgente desliga a IA, envia texto livre pela API Oficial e registra no histórico.
// Fora da janela de 24h devolve services.ErrJanelaFechada (o front oferece o envio do modelo).
func (u *MensagemUseCase) EnviarMensagemAgente(telefone, conteudo string) (*models.HistoricoChat, error) {
	conteudo = strings.TrimSpace(conteudo)
	if conteudo == "" {
		return nil, fmt.Errorf("conteudo vazio")
	}

	janela, err := u.GetJanela(telefone)
	if err != nil {
		return nil, fmt.Errorf("erro ao verificar janela de 24h: %w", err)
	}
	if !janela.Aberta {
		return nil, services.ErrJanelaFechada
	}

	if err := u.repo.SetClienteBloqueado(telefone); err != nil {
		return nil, fmt.Errorf("erro ao desligar a IA: %w", err)
	}

	if _, err := services.EnviarTextoMeta(telefone, conteudo); err != nil {
		return nil, fmt.Errorf("erro ao enviar mensagem: %w", err)
	}

	historico := &models.HistoricoChat{
		Telefone:  telefone,
		Remetente: "agente",
		Conteudo:  conteudo,
		Tipo:      "texto",
	}
	if err := u.repo.CreateHistoricoChat(historico); err != nil {
		return nil, err
	}
	historico.CriadoEm = comHorarioLocal(historico.CriadoEm)
	return historico, nil
}

// textoRetomadaPadrao é usado quando META_TEMPLATE_RETOMADA_TEXTO não está no .env.
const textoRetomadaPadrao = "Olá, {{1}}! Aqui é da equipe da Ouvidoria do gabinete da vereadora Jussara Fernandes. Temos um retorno sobre o seu atendimento. Pode responder esta mensagem para continuarmos?"

// EnviarTemplateRetomada manda a mensagem modelo que convida o cidadão a responder.
// Quando ele responde, a janela de 24h abre e o assessor volta a usar o campo de texto.
//
// Dois modos, conforme o .env:
//   - Sem WEBHOOK_META_ENVIAR (n8n atual, sem alterar): o texto de retomada vai dentro
//     do modelo template_utility pelo webhook WEBHOOK_ENVIAR_MENSAGEM.
//   - Com WEBHOOK_META_ENVIAR: envia o modelo próprio META_TEMPLATE_RETOMADA
//     (idioma META_TEMPLATE_RETOMADA_IDIOMA, {{1}} = primeiro nome se META_TEMPLATE_RETOMADA_NOME=true).
//
// META_TEMPLATE_RETOMADA_TEXTO é o texto de retomada ({{1}} vira o primeiro nome).
func (u *MensagemUseCase) EnviarTemplateRetomada(telefone string) (*models.HistoricoChat, error) {
	primeiroNome := "tudo bem"
	if contato, err := u.repo.GetContatoByTelefone(telefone); err == nil && contato != nil && contato.Nome != nil {
		if campos := strings.Fields(*contato.Nome); len(campos) > 0 && campos[0] != "?" {
			primeiroNome = campos[0]
		}
	}

	texto := strings.TrimSpace(os.Getenv("META_TEMPLATE_RETOMADA_TEXTO"))
	if texto == "" {
		texto = textoRetomadaPadrao
	}
	texto = strings.ReplaceAll(texto, "{{1}}", primeiroNome)

	// desliga a IA: quem chamou foi o assessor, a resposta do cidadão é para ele
	if err := u.repo.SetClienteBloqueado(telefone); err != nil {
		return nil, fmt.Errorf("erro ao desligar a IA: %w", err)
	}

	if services.UsaN8NAtual() {
		if _, err := services.EnviarTextoMeta(telefone, texto); err != nil {
			return nil, fmt.Errorf("erro ao enviar mensagem modelo: %w", err)
		}
	} else {
		nomeTemplate := strings.TrimSpace(os.Getenv("META_TEMPLATE_RETOMADA"))
		if nomeTemplate == "" {
			return nil, fmt.Errorf("META_TEMPLATE_RETOMADA não configurado no .env")
		}
		idioma := strings.TrimSpace(os.Getenv("META_TEMPLATE_RETOMADA_IDIOMA"))
		if idioma == "" {
			idioma = "pt_BR"
		}
		var params []string
		if strings.EqualFold(strings.TrimSpace(os.Getenv("META_TEMPLATE_RETOMADA_NOME")), "true") {
			params = []string{primeiroNome}
		}
		if _, err := services.EnviarTemplateMeta(telefone, nomeTemplate, idioma, params); err != nil {
			return nil, fmt.Errorf("erro ao enviar mensagem modelo: %w", err)
		}
	}

	historico := &models.HistoricoChat{
		Telefone:  telefone,
		Remetente: "agente",
		Conteudo:  "📋 " + texto,
		Tipo:      "texto",
	}
	if err := u.repo.CreateHistoricoChat(historico); err != nil {
		return nil, err
	}
	historico.CriadoEm = comHorarioLocal(historico.CriadoEm)
	return historico, nil
}

func (u *MensagemUseCase) SalvarMidiaChat(telefone, remetente, tipo, linkMidia, conteudo string) (*models.HistoricoChat, error) {
	historico := &models.HistoricoChat{
		Telefone:  telefone,
		Remetente: remetente,
		Conteudo:  strings.TrimSpace(conteudo),
		Tipo:      tipo,
		LinkMidia: linkMidia,
	}
	if err := u.repo.CreateHistoricoChat(historico); err != nil {
		return nil, err
	}
	historico.CriadoEm = comHorarioLocal(historico.CriadoEm)
	return historico, nil
}

func (u *MensagemUseCase) GetHistoricoChat(telefone string) (*models.HistoricoChatResponse, error) {
	historico, err := u.repo.GetHistoricoByTelefone(telefone)
	if err != nil {
		return nil, err
	}
	nome := ""
	contato, err := u.repo.GetContatoByTelefone(telefone)
	if err == nil && contato != nil {
		nome = *contato.Nome
	}
	mensagens := make([]models.MensagemHistorico, 0, len(historico))
	for _, h := range historico {
		mensagens = append(mensagens, models.MensagemHistorico{
			ID:        h.ID,
			Remetente: h.Remetente,
			Conteudo:  h.Conteudo,
			Tipo:      h.Tipo,
			LinkMidia: h.LinkMidia,
			CriadoEm:  comHorarioLocal(h.CriadoEm),
		})
	}
	janela, err := u.GetJanela(telefone)
	if err != nil {
		fmt.Println("Erro ao calcular janela de 24h: ", err)
	}
	return &models.HistoricoChatResponse{
		Telefone:  telefone,
		Nome:      nome,
		Mensagens: mensagens,
		Janela:    janela,
	}, nil
}

func (u *MensagemUseCase) ListConversas() ([]models.ConversaResumo, error) {
	conversas, err := u.repo.ListConversas()
	if err != nil {
		return nil, err
	}
	for i := range conversas {
		conversas[i].CriadoEm = comHorarioLocal(conversas[i].CriadoEm)
	}
	return conversas, nil
}
