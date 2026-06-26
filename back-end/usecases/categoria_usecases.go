package usecases

import (
	"back-end/repository"
)

type CategoriaUseCase struct {
	repo *repository.CategoriaRepo
}

func NewCategoriaUseCase(repo *repository.CategoriaRepo) *CategoriaUseCase {
	return &CategoriaUseCase{repo: repo}
}

func (uc *CategoriaUseCase) GetAllCategorias() ([]string, error) {
	categ, err := uc.repo.GetAllCategorias()
	if err != nil {
		return nil, err
	}

	var categorias []string
	for _, c := range categ {
		categorias = append(categorias, c.Descricao)
	}

	return categorias, nil
}
