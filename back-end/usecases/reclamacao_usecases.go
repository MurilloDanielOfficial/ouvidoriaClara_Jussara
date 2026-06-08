package usecases

import (
	"back-end/models"
	"back-end/repository"
	"back-end/services"
	"fmt"
	"regexp"
	"strings"
)

var categorias = []string{"saúde", "educação", "transporte", "asfalto", "governança"}

type ReclamacaoUseCases struct {
	repository repository.ReclamacaoRepository
}

func NewReclamacaoUseCases(repo repository.ReclamacaoRepository) ReclamacaoUseCases {
	return ReclamacaoUseCases{repository: repo}
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
