package repository

import (
	"back-end/models"
	"database/sql"
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
	const query = `SELECT * FROM cliente WHERE telefonecliente = $1`

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
