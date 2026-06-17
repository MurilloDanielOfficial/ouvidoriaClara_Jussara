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
	const query = `UPDATE reclamacao SET reclamacao = $1 WHERE idreclamacao = $2`
	_, err := repo.connection.Exec(query, novaReclamacao, id)
	return err
}

func (repo ReclamacaoRepository) UpdateStatus(id, status string) error {
	const query = `UPDATE reclamacao SET status = $1 WHERE idreclamacao = $2`
	_, err := repo.connection.Exec(query, status, id)
	return err
}

func (repo ReclamacaoRepository) UpdateStatusTipo(id, status, tipo string) error {
	const query = `UPDATE reclamacao SET status = $1, tipo = $2 WHERE idreclamacao = $3`
	_, err := repo.connection.Exec(query, status, tipo, id)
	return err
}

func (repo ReclamacaoRepository) GetReclamacaoById(id string) (*models.Ocorrencia, error) {
	const query = `SELECT * FROM reclamacao WHERE idreclamacao = $1`
	var data models.Ocorrencia
	err := repo.connection.Get(&data, query, id)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (repo ReclamacaoRepository) GetAllReclamacoes() ([]models.Reclamacao, error) {
	const query = `
		SELECT r.idreclamacao, r.nome, r.telefone, r.categoria, r.regiao, r.resolvido, r.data, r.reclamacao, r.status, r.tipo, p.numero AS protocolo
		FROM reclamacao r
		LEFT JOIN protocolo p ON r.idreclamacao = p.idReclamacao
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

// --------------------------------------------------------------------------------------- NEW

func (repo ReclamacaoRepository) CreateOcorrencia(data models.OcorrenciaData) (int, error) {
	detalhesJSON, err := json.Marshal(data.Detalhes)
	if err != nil {
		return 0, err
	}
	const query = `
		INSERT INTO reclamacao (telefone, categoria, reclamacao, detalhes, eh_manual, observacao)
		VALUES ($1, $2, $3, $4::jsonb, $5, $6)
		RETURNING idreclamacao`
	var id int
	err = repo.connection.QueryRow(query, data.Telefone, data.Categoria, data.Reclamacao, detalhesJSON, data.EhManual, data.Observacao).Scan(&id)
	return id, err
}

func scanOcorrencia(row interface {
	Scan(dest ...any) error
}) (models.Ocorrencia, error) {
	var o models.Ocorrencia
	var detalhesJSON []byte
	if err := row.Scan(
		&o.ID, &o.Telefone, &o.Categoria, &o.SituacaoResumida,
		&o.Tipo, &o.Status, &detalhesJSON, &o.EhManual, &o.Observacao, &o.DataCriacao, &o.DataAtualizacao,
	); err != nil {
		return o, err
	}
	if len(detalhesJSON) > 0 {
		if err := json.Unmarshal(detalhesJSON, &o.Detalhes); err != nil {
			return o, err
		}
	}
	o.Categoria = strings.ToLower(o.Categoria)
	return o, nil
}

func (repo ReclamacaoRepository) GetAllOcorrencias(telefone string) ([]models.Ocorrencia, error) {
	const baseQuery = `
		SELECT idreclamacao, telefone, categoria, reclamacao, tipo, status, detalhes, eh_manual, observacao, data_criacao, data_atualizacao
		FROM reclamacao`

	var rows *sql.Rows
	var err error
	if telefone != "" {
		rows, err = repo.connection.Query(baseQuery+` WHERE telefone = $1 ORDER BY data_criacao DESC`, telefone)
	} else {
		rows, err = repo.connection.Query(baseQuery + ` ORDER BY data_criacao DESC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ocorrencias []models.Ocorrencia
	for rows.Next() {
		o, err := scanOcorrencia(rows)
		if err != nil {
			return nil, err
		}
		ocorrencias = append(ocorrencias, o)
	}
	return ocorrencias, rows.Err()
}

func (repo ReclamacaoRepository) GetOcorrenciaById(id string) (*models.Ocorrencia, error) {
	const query = `
		SELECT idreclamacao, telefone, categoria, reclamacao, tipo, status, detalhes, observacao, data_criacao, data_atualizacao
		FROM reclamacao WHERE idreclamacao = $1`
	row := repo.connection.QueryRow(query, id)
	o, err := scanOcorrencia(row)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (repo ReclamacaoRepository) UpdateOcorrencia(id string, data models.OcorrenciaData, status string) error {
	detalhesJSON, err := json.Marshal(data.Detalhes)
	if err != nil {
		return err
	}
	const query = `
		UPDATE reclamacao
		SET categoria = $1, reclamacao = $2, detalhes = $3::jsonb, status = $4, data_atualizacao = now(), mensagem_final = $5, observacao = $6
		WHERE idreclamacao = $7`
	result, err := repo.connection.Exec(query, data.Categoria, data.Reclamacao, detalhesJSON, status, data.MensagemFinal, data.Observacao, id)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (repo ReclamacaoRepository) DeleteOcorrencia(id string) error {
	const query = `DELETE FROM reclamacao WHERE idreclamacao = $1`
	result, err := repo.connection.Exec(query, id)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
