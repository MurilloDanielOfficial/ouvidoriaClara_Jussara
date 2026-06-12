package usecases

import (
	"back-end/apperror"
	"back-end/models"
	"back-end/repository"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type ClienteUseCase struct {
	repo *repository.ClienteRepo
}

func NewClienteUseCase(repo *repository.ClienteRepo) *ClienteUseCase {
	return &ClienteUseCase{repo: repo}
}

func (u *ClienteUseCase) CreateCliente(c models.Cliente) (string, error) {
	return u.repo.CreateCliente(c)
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

func (u *ClienteUseCase) ClienteExiste(telefoneCliente string) (bool, *models.Cliente, error) {
	existe, cliente, err := u.repo.ClienteExiste(telefoneCliente)
	if err != nil {
		return false, nil, err
	}
	if existe {
		return existe, cliente, nil
	}
	return false, nil, nil
}

func (u *ClienteUseCase) CreateClienteDify(cliente *models.Cliente) error {
	if !validarCampos(cliente.Telefone, cliente.DataNascimento, cliente.Nome, cliente.Cidade) {
		return apperror.BadRequest("nome, idade, telefone ou cidade invalidos")
	}
	existe, clienteExistente, err := u.ClienteExiste(cliente.Telefone)
	if err != nil {
		return fmt.Errorf("erro ao verificar se cliente existe: %w", err)
	}
	if !existe {
		telefone, err := u.CreateCliente(*cliente)
		if err != nil {
			return fmt.Errorf("erro ao criar cliente: %w", err)
		}
		cliente.Telefone = telefone
	} else {
		cliente = clienteExistente
	}
	return nil
}
func validarCampos(campos ...string) bool {
	for _, campo := range campos {
		s := strings.TrimSpace(strings.ToLower(campo))
		if s == "" || s == "none" || strings.Contains(s, "não") {
			return false
		}
	}
	return true
}
