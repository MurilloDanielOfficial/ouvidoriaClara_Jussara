package usecases

import (
	"back-end/models"
	"back-end/repository"
)

type CategoriaUseCase struct {
	repo *repository.CategoriaRepo
}

func NewCategoriaUseCase(repo *repository.CategoriaRepo) *CategoriaUseCase {
	return &CategoriaUseCase{repo: repo}
}

func (uc *CategoriaUseCase) GetAllCategorias() ([]models.Categoria, error){
	return uc.repo.GetAllCategorias()
}
