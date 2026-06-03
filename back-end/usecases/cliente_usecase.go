package usecases

import (
    "back-end/apperror"
    "back-end/models"
    "back-end/repository"
    "database/sql"
    "errors"
)

type ClienteUseCase struct {
    repo *repository.ClienteRepo
}

func NewClienteUseCase(repo *repository.ClienteRepo) *ClienteUseCase {
    return &ClienteUseCase{repo: repo}
}

func (u *ClienteUseCase) CreateCliente(c models.Cliente) error {
    if err := u.repo.CreateCliente(c); err != nil {
        return apperror.Internal(err.Error())
    }
    return nil
}

func (u *ClienteUseCase) GetClienteByTelefone(telefone string) (models.Cliente, error) {
    c, err := u.repo.GetClienteByTelefone(telefone)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return models.Cliente{}, apperror.NotFound("Cliente não encontrado")
        }
        return models.Cliente{}, apperror.Internal(err.Error())
    }
    return c, nil
}

func (u *ClienteUseCase) GetAllClientes() ([]models.Cliente, error) {
    list, err := u.repo.GetAllClientes()
    if err != nil {
        return nil, apperror.Internal(err.Error())
    }
    return list, nil
}

func (u *ClienteUseCase) UpdateCliente(telefone string, c models.Cliente) error {
    if err := u.repo.UpdateCliente(telefone, c); err != nil {
        return apperror.Internal(err.Error())
    }
    return nil
}

func (u *ClienteUseCase) DeleteCliente(telefone string) error {
    if err := u.repo.DeleteCliente(telefone); err != nil {
        return apperror.Internal(err.Error())
    }
    return nil
}
