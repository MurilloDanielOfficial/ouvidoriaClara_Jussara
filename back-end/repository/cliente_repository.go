package repository

import (
	"back-end/models"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jmoiron/sqlx"
)

type ClienteRepo struct {
	db *sqlx.DB
}

func NewClienteRepo(db *sqlx.DB) *ClienteRepo {
	return &ClienteRepo{db: db}
}

func (r *ClienteRepo) CreateCliente(c models.Cliente) (string, error) {
	const query = `INSERT INTO cliente (telefone, nome, cidade, endereco, bairro, data_nascimento) VALUES ($1,$2,$3,$4,$5,$6) RETURNING telefone;`
	var telefone string
	err := r.db.Get(&telefone, query, c.Telefone, c.Nome, c.Cidade, c.Endereco, c.Bairro, c.DataNascimento)
	return telefone, err
}

func (r *ClienteRepo) GetClienteByTelefone(telefone string) (models.Cliente, error) {
	const query = `SELECT telefone, nome, cidade, endereco, bairro, data_nascimento, data_criacao FROM cliente WHERE telefone = $1`
	var c models.Cliente
	err := r.db.Get(&c, query, telefone)
	return c, err
}

func (r *ClienteRepo) GetAllClientes() ([]models.Cliente, error) {
	const query = `SELECT telefone, nome, cidade, endereco, bairro, data_nascimento, data_criacao FROM cliente ORDER BY nome`
	var list []models.Cliente
	err := r.db.Select(&list, query)
	return list, err
}

func (r *ClienteRepo) UpdateCliente(telefone string, c models.Cliente) error {
	const query = `UPDATE cliente SET nome = $1, cidade = $2, endereco = $3, bairro = $4, data_nascimento = $5 WHERE telefone = $6`
	_, err := r.db.Exec(query, c.Nome, c.Cidade, c.Endereco, c.Bairro, c.DataNascimento, telefone)
	return err
}

func (r *ClienteRepo) DeleteCliente(telefone string) error {
	const query = `DELETE FROM cliente WHERE telefone = $1`
	_, err := r.db.Exec(query, telefone)
	return err
}

func (r *ClienteRepo) ClienteExiste(telefoneCliente string) (bool, *models.Cliente, error) {
	const query = `SELECT * FROM cliente WHERE telefone = $1`

	var cliente models.Cliente
	err := r.db.Get(&cliente, query, telefoneCliente)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil, nil
		}
		return false, nil, fmt.Errorf("erro ao verificar existência do cliente: %w", err)
	}

	return true, &cliente, nil
}

func (repo ClienteRepo) GetClienteBloqueadoById(telefoneCliente string) error {
	query := `SELECT idcliente FROM clientesbloqueados WHERE idcliente = $1`

	var bloqueado string
	err := repo.db.Get(&bloqueado, query, telefoneCliente)
	if err != nil {
		return err
	}
	return nil
}

func (repo ClienteRepo) SetClienteBloqueado(idCliente string) error {
	query := `INSERT INTO clientesbloqueados (idcliente) VALUES ($1) ON CONFLICT DO NOTHING`

	_, err := repo.db.Exec(query, idCliente)
	if err != nil {
		return err
	}
	return nil
}

func (repo ClienteRepo) DeleteClienteBloqueadoByID(idCliente string) error {
	query := `DELETE FROM clientesbloqueados WHERE idcliente = $1`

	_, err := repo.db.Exec(query, idCliente)
	if err != nil {
		return err
	}
	return nil
}

func (repo ClienteRepo) GetClientesGelo() ([]models.ClienteGelo, error) {
	const query = `SELECT c.nome, c.telefone, c.ativo
					FROM contatos c
					LEFT JOIN reclamacao r ON c.telefone = r.telefone
					WHERE c.telefone IS NULL`

	var clientes []models.ClienteGelo
	err := repo.db.Select(&clientes, query)
	if err != nil {
		return nil, err
	}
	return clientes, nil
}

func (repo ClienteRepo) GetClienteAtivo(telefone string) (bool, error) {
	const query = `
		SELECT 1
		FROM cliente
		WHERE telefone = $1
	`

	var exists int
	err := repo.db.Get(&exists, query, telefone)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (repo ClienteRepo) GetDadosCliente(telefone string) (models.ClienteDadosDTO, error) {
	const query = `
		SELECT nomecliente, telefone
		FROM cliente
		WHERE telefone = $1
	`
	var dados models.ClienteDadosDTO
	err := repo.db.Get(&dados, query, telefone)
	if err != nil {
		return models.ClienteDadosDTO{}, fmt.Errorf("erro ao buscar dados do cliente: %v", err)
	}
	return dados, nil
}