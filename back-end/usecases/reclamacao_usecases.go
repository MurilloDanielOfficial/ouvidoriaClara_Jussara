package usecases

import (
	"back-end/apperror"
	"back-end/models"
	"back-end/repository"
	"back-end/services"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var categorias = []string{"geral", "maus tratos", "abandono presenciado", "animal apareceu na rua", "ajuda animal comunitario", "saude animal", "castracao eletiva", "castracao emergencial", "animais nao domiciliados", "animal desaparecido", "animal para ser adotado", "adocao de animais", "animal grande porte", "animal atropelado", "cuidados animais", "animais silvestres", "equipamentos"}

type ReclamacaoUseCases struct {
	repository repository.ReclamacaoRepository
	enderecoUC EnderecoUseCases
}

func NewReclamacaoUseCases(repo repository.ReclamacaoRepository, enderecoUC EnderecoUseCases) ReclamacaoUseCases {
	return ReclamacaoUseCases{repository: repo, enderecoUC: enderecoUC}
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
	if err := uc.repository.UpdateStatus(id, "aprovado"); err != nil {
		return err
	}
	data, err := uc.repository.GetReclamacaoById(id)
	if err != nil {
		return err
	}
	if _, err := services.EnviaInquerito(*data); err != nil {
		return err
	}
	return nil
}

func (uc ReclamacaoUseCases) AprovarRequerimento(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "aprovado", "requerimento"); err != nil {
		return err
	}
	data, err := uc.repository.GetReclamacaoById(id)
	if err != nil {
		return err
	}
	if _, err := services.EnviaRequerimento(*data); err != nil {
		return err
	}
	return nil
}

func (uc ReclamacaoUseCases) AprovarOficio(id string) error {
	if err := uc.repository.UpdateStatusTipo(id, "aprovado", "ofício"); err != nil {
		return err
	}
	data, err := uc.repository.GetReclamacaoById(id)
	if err != nil {
		return err
	}
	if _, err := services.EnviaOficio(*data); err != nil {
		return err
	}
	return nil
}

func (uc ReclamacaoUseCases) AprovarComoAmbos(id string) error {
	if err := uc.repository.UpdateStatus(id, "aprovado"); err != nil {
		return err
	}
	data, err := uc.repository.GetReclamacaoById(id)
	if err != nil {
		return err
	}

	if !strings.Contains(data.Reclamacao, "$$") {
		if _, err := services.EnviaInquerito(*data); err != nil {
			return err
		}
		body, convErr := services.ConvertIndicacao(data.Reclamacao)
		if convErr != nil {
			return convErr
		}
		data.Reclamacao = body
		if _, err := services.EnviaRequerimento(*data); err != nil {
			return err
		}
		return nil
	}

	if _, err := services.EnviaRequerimento(*data); err != nil {
		return err
	}
	body, convErr := services.ConvertRequerimento(data.Reclamacao)
	if convErr != nil {
		return convErr
	}
	data.Reclamacao = body
	if _, err := services.EnviaInquerito(*data); err != nil {
		return err
	}
	return nil
}

func (uc ReclamacaoUseCases) ReprovarInquerito(id string) error {
	return uc.repository.UpdateStatus(id, "reprovado")
}

//new

func (uc ReclamacaoUseCases) CreateOcorrencia(request models.OcorrenciaRequest) (int, error) {
	if request.Telefone == "" {
		return 0, apperror.BadRequest("Telefone obrigatório")
	}
	request.Categoria = strings.ToLower(request.Categoria)
	if !ehCategoria(request.Categoria) {
		return 0, apperror.BadRequest("Categoria inválida")
	}

	request.Telefone = normalizeTelefone(request.Telefone)

	data := models.OcorrenciaData{
		Telefone:   request.Telefone,
		Categoria:  request.Categoria,
		Reclamacao: request.SituacaoResumida,
		Detalhes:   request.DetalhesReclamacao,
	}
	regiao := ""
	switch data.Categoria {
	case "maus tratos":
		regiao = uc.enderecoUC.GetRegiao(request.EnderecoOcorrencia)
	case "animal apareceu na rua", "ajuda animal comunitario", "animal desaparecido", "animal para ser adotado":
		regiao = uc.enderecoUC.GetRegiaoPorBairro(request.BairroAnimal)
	}
	data.Detalhes.Regiao = regiao
	id, err := uc.repository.CreateOcorrencia(data)
	if err != nil {
		return 0, apperror.Internal(err.Error())
	}
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

	detalhes := atual.Detalhes
	detalhes = mergeDetalhes(detalhes, request.DetalhesReclamacao)

	data := models.OcorrenciaData{
		Telefone:   atual.Telefone,
		Categoria:  categoria,
		Reclamacao: situacao,
		Detalhes:   detalhes,
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
