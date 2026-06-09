package repository

import (
	"back-end/models"
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/jmoiron/sqlx"
)

type ReclamacaoRepository struct {
	connection *sqlx.DB
}

func NewReclamacaoRepository(conn *sqlx.DB) ReclamacaoRepository {
	return ReclamacaoRepository{connection: conn}
}

func (repo ReclamacaoRepository) CreateReclamacao(data models.RequestData) error {
	const query = `INSERT INTO reclamacao (nome, telefone, categoria, regiao, reclamacao) VALUES ($1, $2, $3, $4, $5)`
	_, err := repo.connection.Exec(query, data.Nome, data.Telefone, data.Categoria, data.Regiao, data.Reclamacao)
	return err
}

func (repo ReclamacaoRepository) UpdateReclamacao(id, novaReclamacao string) error {
	const query = `UPDATE reclamacao SET reclamacao = $1 WHERE id = $2`
	_, err := repo.connection.Exec(query, novaReclamacao, id)
	return err
}

func (repo ReclamacaoRepository) UpdateStatus(id, status string) error {
	const query = `UPDATE reclamacao SET status = $1 WHERE id = $2`
	_, err := repo.connection.Exec(query, status, id)
	return err
}

func (repo ReclamacaoRepository) UpdateStatusTipo(id, status, tipo string) error {
	const query = `UPDATE reclamacao SET status = $1, tipo = $2 WHERE id = $3`
	_, err := repo.connection.Exec(query, status, tipo, id)
	return err
}

func (repo ReclamacaoRepository) GetReclamacaoById(id string) (*models.Inquerito, error) {
	const query = `SELECT id, reclamacao, nome, telefone, categoria, regiao FROM reclamacao WHERE id = $1`
	var data models.Inquerito
	err := repo.connection.Get(&data, query, id)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (repo ReclamacaoRepository) GetAllReclamacoes() ([]models.Reclamacao, error) {
	const query = `
		SELECT r.id, r.nome, r.telefone, r.categoria, r.regiao, r.resolvido, r.data, r.reclamacao, r.status, r.tipo, p.numero AS protocolo
		FROM reclamacao r
		LEFT JOIN protocolo p ON r.id = p.idReclamacao
		ORDER BY data DESC;`

	rows, err := repo.connection.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reclamacoes []models.Reclamacao
	for rows.Next() {
		var reclamacao models.Reclamacao
		var protocolo sql.NullInt64
		if err := rows.Scan(&reclamacao.ID, &reclamacao.Nome, &reclamacao.Telefone, &reclamacao.Categoria,
			&reclamacao.Regiao, &reclamacao.Resolvido, &reclamacao.DataCriacao, &reclamacao.Reclamacao,
			&reclamacao.Status, &reclamacao.Tipo, &protocolo); err != nil {
			return nil, err
		}
		if protocolo.Valid {
			val := int(protocolo.Int64)
			reclamacao.Protocolo = &val
		}
		reclamacao.Categoria = strings.ToLower(reclamacao.Categoria)
		reclamacoes = append(reclamacoes, reclamacao)
	}
	return reclamacoes, nil
}

func (repo ReclamacaoRepository) CreateOcorrencia(data models.OcorrenciaData) error {
	detalhesJSON, _ := json.Marshal(data.Detalhes)
	const query = `
        INSERT INTO reclamacao (telefone, categoria, reclamacao, detalhes)
        VALUES ($1, $2, $3, $4::jsonb)`
	_, err := repo.connection.Exec(query, data.Telefone, data.Categoria, data.Reclamacao, detalhesJSON)
	return err
}
