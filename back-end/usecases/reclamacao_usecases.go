package usecases

import (
	"back-end/apperror"
	"back-end/config"
	"back-end/models"
	"back-end/repository"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"
)

var categorias = []string{"geral", "maus tratos", "abandono presenciado", "animal apareceu na rua", "ajuda animal comunitario", "saude animal", "castracao eletiva", "castracao emergencial", "animais nao domiciliados", "animal desaparecido", "animal para ser adotado", "adocao de animais", "animal grande porte", "animal atropelado", "cuidados animais", "animais silvestres", "equipamentos"}

type ReclamacaoUseCases struct {
	repository repository.ReclamacaoRepository
	enderecoUC EnderecoUseCases
	clienteUC  ClienteUseCase
}

func NewReclamacaoUseCases(repo repository.ReclamacaoRepository, enderecoUC EnderecoUseCases, clienteUC ClienteUseCase) ReclamacaoUseCases {
	return ReclamacaoUseCases{repository: repo, enderecoUC: enderecoUC, clienteUC: clienteUC}
}

func ehCategoria(str string) bool {
	str = strings.ToLower(str)
	for _, cat := range categorias {
		if str == cat {
			return true
		}
	}
	return false
}

func normalizeTelefone(telefone string) string {
	re := regexp.MustCompile(`\D`)
	somenteNumeros := re.ReplaceAllString(telefone, "")
	somenteNumeros = strings.TrimPrefix(somenteNumeros, "0")
	if !strings.HasPrefix(somenteNumeros, "55") {
		somenteNumeros = "55" + somenteNumeros
	}
	if len(somenteNumeros) > 13 {
		somenteNumeros = somenteNumeros[:13]
	}
	return somenteNumeros
}

func (uc ReclamacaoUseCases) CreateReclamacao(data models.RequestData) error {
	if !ehCategoria(data.Categoria) {
		return fmt.Errorf("Categoria inválida")
	}

	data.Telefone = normalizeTelefone(data.Telefone)
	unwantedPhrases := []string{
		"Indico ao Excelentíssimo Senhor Prefeito Municipal que,",
		"Considerando que",
	}
	for _, phrase := range unwantedPhrases {
		data.Reclamacao = strings.TrimSpace(strings.ReplaceAll(data.Reclamacao, phrase, ""))
	}
	data.Categoria = strings.ToLower(data.Categoria)

	return uc.repository.CreateReclamacao(data)
}

func (uc ReclamacaoUseCases) EditarReclamacao(id, novaReclamacao string) error {
	return uc.repository.UpdateReclamacao(id, novaReclamacao)
}

func (uc ReclamacaoUseCases) GetAllReclamacoes() ([]models.Reclamacao, error) {
	return uc.repository.GetAllReclamacoes()
}

func (uc ReclamacaoUseCases) AprovarInquerito(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "aprovado", "indicacao"); err != nil {
		return err
	}
	// data, err := uc.repository.GetReclamacaoById(id)
	// if err != nil {
	// 	return err
	// }
	// if _, err := services.EnviaInquerito(*data); err != nil {
	// 	return err
	// }
	return nil
}
func (uc ReclamacaoUseCases) ColocarEmAnalise(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "em análise", ""); err != nil {
		return err
	}
	// data, err := uc.repository.GetReclamacaoById(id)
	// if err != nil {
	// 	return err
	// }
	// if _, err := services.EnviaInquerito(*data); err != nil {
	// 	return err
	// }
	return nil
}
func (uc ReclamacaoUseCases) ColocarComoCriado(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "criado", ""); err != nil {
		return err
	}
	// data, err := uc.repository.GetReclamacaoById(id)
	// if err != nil {
	// 	return err
	// }
	// if _, err := services.EnviaInquerito(*data); err != nil {
	// 	return err
	// }
	return nil
}

func (uc ReclamacaoUseCases) AprovarRequerimento(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "aprovado", "requerimento"); err != nil {
		return err
	}
	// data, err := uc.repository.GetReclamacaoById(id)
	// if err != nil {
	// 	return err
	// }
	// if _, err := services.EnviaRequerimento(*data); err != nil {
	// 	return err
	// }
	return nil
}

// func (uc ReclamacaoUseCases) AprovarOficio(id string) error {
// 	if err := uc.repository.UpdateStatusTipo(id, "aprovado", "ofício"); err != nil {
// 		return err
// 	}
// 	data, err := uc.repository.GetReclamacaoById(id)
// 	if err != nil {
// 		return err
// 	}
// 	if _, err := services.EnviaOficio(*data); err != nil {
// 		return err
// 	}
// 	return nil
// }

func (uc ReclamacaoUseCases) AprovarComoAmbos(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "aprovado", "ambos"); err != nil {
		return err
	}
	// data, err := uc.repository.GetReclamacaoById(id)
	// if err != nil {
	// 	return err
	// }

	// if !strings.Contains(data.Reclamacao, "$$") {
	// 	if _, err := services.EnviaInquerito(*data); err != nil {
	// 		return err
	// 	}
	// 	body, convErr := services.ConvertIndicacao(data.Reclamacao)
	// 	if convErr != nil {
	// 		return convErr
	// 	}
	// 	data.Reclamacao = body
	// 	if _, err := services.EnviaRequerimento(*data); err != nil {
	// 		return err
	// 	}
	// 	return nil
	// }

	// if _, err := services.EnviaRequerimento(*data); err != nil {
	// 	return err
	// }
	// body, convErr := services.ConvertRequerimento(data.Reclamacao)
	// if convErr != nil {
	// 	return convErr
	// }
	// data.Reclamacao = body
	// if _, err := services.EnviaInquerito(*data); err != nil {
	// 	return err
	// }
	return nil
}

func (uc ReclamacaoUseCases) ReprovarInquerito(id string) error {
	return uc.repository.UpdateStatus(id, "reprovado")
}

//------------------------------------------------------------------------------------------ new

func (uc ReclamacaoUseCases) CreateOcorrencia(request models.OcorrenciaRequest) (int, error) {
	if request.Telefone == "" {
		return 0, apperror.BadRequest("Telefone obrigatório")
	}

	request.Categoria = strings.ToLower(request.Categoria)
	if !ehCategoria(request.Categoria) {
		return 0, apperror.BadRequest("Categoria inválida")
	}

	existe, cliente, err := uc.clienteUC.ClienteExiste(request.Telefone)
	if err != nil {
		return 0, apperror.NotFound("Erro ao verificar cliente existe")
	}

	if !existe {
		clienteReq := models.Cliente{
			Telefone:       request.Telefone,
			Nome:           request.NomeCliente,
			Cidade:         request.CidadeCliente,
			Endereco:       request.EnderecoCliente,
			Bairro:         request.BairroCliente,
			DataNascimento: request.DataNascimentoCliente,
		}
		_, err := uc.clienteUC.repo.CreateCliente(clienteReq)
		if err != nil {
			return 0, apperror.Internal("Erro ao cadastrar novo cliente")
		}
		cliente = &clienteReq
	}

	request.Telefone = normalizeTelefone(request.Telefone)

	data := models.OcorrenciaData{
		Telefone:   request.Telefone,
		Categoria:  request.Categoria,
		Reclamacao: request.SituacaoResumida,
		Detalhes:   request.DetalhesReclamacao,
		EhManual:   request.EhManual,
		Observacao: request.Observacao,
	}
	regiao := ""
	switch data.Categoria {
	case "maus tratos", "animais nao domiciliados":
		regiao = uc.enderecoUC.GetRegiao(request.EnderecoOcorrencia)
	case "animal apareceu na rua", "ajuda animal comunitario", "animal desaparecido", "animal para ser adotado":
		regiao = uc.enderecoUC.GetRegiaoPorBairro(request.BairroAnimal)
	}
	data.Detalhes.Regiao = regiao

	if data.Detalhes.TelefoneResponsavelAnimal != "" {
		data.Detalhes.TelefoneResponsavelAnimal = normalizeTelefone(data.Detalhes.TelefoneResponsavelAnimal)
	}
	id, err := uc.repository.CreateOcorrencia(data)
	if err != nil {
		return 0, apperror.Internal(err.Error())
	}

	telefoneEnvio := os.Getenv("TELEFONE_MAUS_TRATOS")
	if data.Categoria == "geral" {
		telefoneEnvio = os.Getenv("TELEFONE_GERAL")
		msg := uc.GerarMensagemEmail(*cliente, data)
		destinatario := os.Getenv("EMAIL_DESTINO")
		config.EnviarEmail(destinatario, "Nova demanda geral", "text/plain", msg)
	}
	if !data.EhManual {
		msg := uc.GerarMensagemNovaOcorrencia(*cliente, data)

		config.EnviarMensagem(telefoneEnvio, msg)
		if data.Detalhes.MidiasAnimal != "" {
			midias := strings.Split(data.Detalhes.MidiasAnimal, ",")

			for _, midia := range midias {
				midia = strings.TrimSpace(midia)
				config.EnviarMidia(telefoneEnvio, "", midia)
			}
		}
		
	}
	//aqui limpar atividadecliente
	return id, nil
}

func (uc ReclamacaoUseCases) GetAllOcorrencias(telefone string) ([]models.Ocorrencia, error) {
	if telefone != "" {
		telefone = normalizeTelefone(telefone)
	}
	list, err := uc.repository.GetAllOcorrencias(telefone)
	if err != nil {
		return nil, apperror.Internal(err.Error())
	}
	return list, nil
}

func (uc ReclamacaoUseCases) GetOcorrenciaById(id string) (models.Ocorrencia, error) {
	o, err := uc.repository.GetOcorrenciaById(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Ocorrencia{}, apperror.NotFound("Ocorrência não encontrada")
		}
		return models.Ocorrencia{}, apperror.Internal(err.Error())
	}
	return *o, nil
}

func (uc ReclamacaoUseCases) UpdateOcorrencia(id string, request models.OcorrenciaUpdateRequest) error {
	atual, err := uc.repository.GetOcorrenciaById(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return apperror.NotFound("Ocorrência não encontrada")
		}
		return apperror.Internal(err.Error())
	}

	categoria := atual.Categoria
	if request.Categoria != "" {
		if !ehCategoria(request.Categoria) {
			return apperror.BadRequest("Categoria inválida")
		}
		categoria = strings.ToLower(request.Categoria)
	}

	situacao := atual.SituacaoResumida
	if request.SituacaoResumida != "" {
		situacao = request.SituacaoResumida
	}

	status := atual.Status
	if request.Status != "" {
		status = request.Status
	}

	mensagemFinal := atual.MensagemFinal
	if request.MensagemFinal != "" {
		mensagemFinal = request.MensagemFinal
	}

	detalhes := atual.Detalhes
	detalhes = mergeDetalhes(detalhes, request.DetalhesReclamacao)

	data := models.OcorrenciaData{
		Telefone:      atual.Telefone,
		Categoria:     categoria,
		Reclamacao:    situacao,
		Detalhes:      detalhes,
		MensagemFinal: mensagemFinal,
	}

	if err := uc.repository.UpdateOcorrencia(id, data, status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return apperror.NotFound("Ocorrência não encontrada")
		}
		return apperror.Internal(err.Error())
	}
	return nil
}

func (uc ReclamacaoUseCases) DeleteOcorrencia(id string) error {
	if err := uc.repository.DeleteOcorrencia(id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return apperror.NotFound("Ocorrência não encontrada")
		}
		return apperror.Internal(err.Error())
	}
	return nil
}

func mergeDetalhes(atual, patch models.DetalhesReclamacao) models.DetalhesReclamacao {
	if patch.EnderecoOcorrencia != "" {
		atual.EnderecoOcorrencia = patch.EnderecoOcorrencia
	}
	if patch.ConheceTutor != "" {
		atual.ConheceTutor = patch.ConheceTutor
	}
	if patch.CondicoesAnimal != "" {
		atual.CondicoesAnimal = patch.CondicoesAnimal
	}
	if patch.FrequenciaMausTratos != "" {
		atual.FrequenciaMausTratos = patch.FrequenciaMausTratos
	}
	if patch.NomeAnimal != "" {
		atual.NomeAnimal = patch.NomeAnimal
	}
	if patch.EspecieAnimal != "" {
		atual.EspecieAnimal = patch.EspecieAnimal
	}
	if patch.IdadeAnimal != "" {
		atual.IdadeAnimal = patch.IdadeAnimal
	}
	if patch.SexoAnimal != "" {
		atual.SexoAnimal = patch.SexoAnimal
	}
	if patch.BairroAnimal != "" {
		atual.BairroAnimal = patch.BairroAnimal
	}
	if patch.NomeResponsavelAnimal != "" {
		atual.NomeResponsavelAnimal = patch.NomeResponsavelAnimal
	}
	if patch.TelefoneResponsavelAnimal != "" {
		atual.TelefoneResponsavelAnimal = patch.TelefoneResponsavelAnimal
	}
	if patch.HistoricoAnimal != "" {
		atual.HistoricoAnimal = patch.HistoricoAnimal
	}
	if patch.TemCadUnico != "" {
		atual.TemCadUnico = patch.TemCadUnico
	}
	if patch.EhProtetorIndependente != "" {
		atual.EhProtetorIndependente = patch.EhProtetorIndependente
	}
	if patch.SituacaoAnimal != "" {
		atual.SituacaoAnimal = patch.SituacaoAnimal
	}
	if patch.QuandoCruzou != "" {
		atual.QuandoCruzou = patch.QuandoCruzou
	}
	if patch.InfoSaudeAnimal != "" {
		atual.InfoSaudeAnimal = patch.InfoSaudeAnimal
	}
	if patch.DetalhesDenuncia != "" {
		atual.DetalhesDenuncia = patch.DetalhesDenuncia
	}
	if patch.TempoAnimalLocal != "" {
		atual.TempoAnimalLocal = patch.TempoAnimalLocal
	}
	if patch.FerimentosAnimal != "" {
		atual.FerimentosAnimal = patch.FerimentosAnimal
	}
	if patch.ProvidenciasAnimal != "" {
		atual.ProvidenciasAnimal = patch.ProvidenciasAnimal
	}
	if patch.MidiasAnimal != "" {
		atual.MidiasAnimal = patch.MidiasAnimal
	}
	if patch.ProtocoloDenuncia != "" {
		atual.ProtocoloDenuncia = patch.ProtocoloDenuncia
	}
	return atual
}

func (uc *ReclamacaoUseCases) GerarMensagemEmail(cliente models.Cliente, ocorrencia models.OcorrenciaData) string {
	var msg strings.Builder

	addCampo := func(emoji, titulo, valor string) {
		if strings.TrimSpace(valor) != "" {
			msg.WriteString(fmt.Sprintf("%s %s: %s\n", emoji, titulo, valor))
		}
	}
	dataTime, err := time.Parse("2006-01-02", cliente.DataNascimento)
	if err != nil {
		fmt.Println("erro ao gerar card nova ocorrencia: ", err)
		return ""
	}

	dataNascimento := dataTime.Format("02/01/2006")

	msg.WriteString("Olá, aqui é a Ju, assistente virtual da Vereadora Jussara Fernandes\n")
	msg.WriteString("Foi detectado uma nova ocorrência de assuntos gerais, segue os dados:\n\n")
	msg.WriteString("SOBRE O CLIENTE:\n")
	addCampo("🪪", "Nome", cliente.Nome)
	addCampo("📱", "Telefone", cliente.Telefone)
	addCampo("🎂", "Data de Nascimento", dataNascimento)
	addCampo("🏙️", "Cidade", cliente.Cidade)
	addCampo("🏠", "Endereço", cliente.Endereco)
	addCampo("📍", "Bairro", cliente.Bairro)
	msg.WriteString("\n\n")
	msg.WriteString("SOBRE A OCORRÊNCIA:\n")
	addCampo("📝", "Reclamação", ocorrencia.Reclamacao)

	return msg.String()
}

func (uc *ReclamacaoUseCases) GerarMensagemNovaOcorrencia(cliente models.Cliente, ocorrencia models.OcorrenciaData) string {
	var msg strings.Builder

	addCampo := func(emoji, titulo, valor string) {
		if strings.TrimSpace(valor) != "" {
			msg.WriteString(fmt.Sprintf("%s *%s:* %s\n", emoji, titulo, valor))
		}
	}

	dataTime, err := time.Parse("2006-01-02", cliente.DataNascimento)
	if err != nil {
		fmt.Println("erro ao gerar card nova ocorrencia: ", err)
		return ""
	}
	dataNascimento := dataTime.Format("02/01/2006")

	msg.WriteString("📋 *NOVA OCORRÊNCIA* 📋\n\n")

	// =========================
	// CLIENTE
	// =========================
	msg.WriteString("👤 *DADOS DO CLIENTE*\n")

	addCampo("🪪", "Nome", cliente.Nome)
	addCampo("📱", "Telefone", cliente.Telefone)
	addCampo("🎂", "Data de Nascimento", dataNascimento)
	addCampo("🏙️", "Cidade", cliente.Cidade)
	addCampo("🏠", "Endereço", cliente.Endereco)
	addCampo("📍", "Bairro", cliente.Bairro)

	msg.WriteString("\n")

	// =========================
	// OCORRÊNCIA
	// =========================
	msg.WriteString("🚨 *DADOS DA OCORRÊNCIA*\n")

	addCampo("📂", "Categoria", ocorrencia.Categoria)
	addCampo("📝", "Reclamação", ocorrencia.Reclamacao)
	addCampo("🗺️", "Região", ocorrencia.Regiao)

	d := ocorrencia.Detalhes

	// Maus-tratos
	addCampo("📌", "Endereço da Ocorrência", d.EnderecoOcorrencia)
	addCampo("👨‍👩‍👧", "Conhece o Tutor", d.ConheceTutor)
	addCampo("🐾", "Condições do Animal", d.CondicoesAnimal)
	addCampo("🔁", "Frequência dos Maus-tratos", d.FrequenciaMausTratos)

	// Animal
	addCampo("🐶", "Nome do Animal", d.NomeAnimal)
	addCampo("🦴", "Espécie", d.EspecieAnimal)
	addCampo("⏳", "Idade", d.IdadeAnimal)
	addCampo("⚧️", "Sexo", d.SexoAnimal)
	addCampo("📍", "Bairro do Animal", d.BairroAnimal)
	addCampo("🙋", "Responsável", d.NomeResponsavelAnimal)
	addCampo("☎️", "Telefone do Responsável", d.TelefoneResponsavelAnimal)
	addCampo("📖", "Histórico do Animal", d.HistoricoAnimal)

	// Saúde
	addCampo("💳", "Possui CadÚnico", d.TemCadUnico)
	addCampo("🛟", "Protetor Independente", d.EhProtetorIndependente)
	addCampo("🏥", "Situação do Animal", d.SituacaoAnimal)

	// Castração
	addCampo("💕", "Quando Cruzou", d.QuandoCruzou)
	addCampo("🩺", "Informações de Saúde", d.InfoSaudeAnimal)

	// Denúncia
	addCampo("📣", "Detalhes da Denúncia", d.DetalhesDenuncia)

	// Silvestres
	addCampo("⏰", "Tempo no Local", d.TempoAnimalLocal)
	addCampo("🩹", "Ferimentos", d.FerimentosAnimal)
	addCampo("🚑", "Providências Tomadas", d.ProvidenciasAnimal)

	// Comuns
	addCampo("📸", "Mídias", d.MidiasAnimal)
	addCampo("📑", "Protocolo", d.ProtocoloDenuncia)

	if d.Regiao != "" && d.Regiao != ocorrencia.Regiao {
		addCampo("🌎", "Região Informada", d.Regiao)
	}

	return msg.String()
}
