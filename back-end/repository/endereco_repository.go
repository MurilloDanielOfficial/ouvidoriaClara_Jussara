package repository

import (
	"back-end/models"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
)

type EnderecoRepository struct {
	connection *sqlx.DB
}

func NewEnderecoRepository(conn *sqlx.DB) EnderecoRepository {
	return EnderecoRepository{connection: conn}
}

func (repo EnderecoRepository) GetAllEnderecos() ([]models.Logradouro, error) {
	const query = `SELECT * FROM enderecos`

	var enderecos []models.Logradouro
	err := repo.connection.Select(&enderecos, query)
	return enderecos, err
}

func (repo EnderecoRepository) GetEnderecoById(id int) (*models.Logradouro, error) {
	const query = `SELECT * FROM enderecos WHERE id = $1`
	var endereco models.Logradouro
	err := repo.connection.Get(&endereco, query, id)
	return &endereco, err
}

func (repo EnderecoRepository) UpdateEndereco(endereco *models.Logradouro) error {
	const query = `
		UPDATE endereco SET
			logradouro = $1,
			bairro = $2,
			regiao = $3
			WHERE id = $4`
	_, err := repo.connection.Exec(query, endereco.Logradouro, endereco.Bairro, endereco.Regiao, endereco.Id)
	return err
}

func (repo EnderecoRepository) DeleteEndereco(id int) error {
	const query = `DELETE FROM endereco WHERE id = $1`
	_, err := repo.connection.Exec(query, id)
	return err
}

func (repo EnderecoRepository) GetRegiaoByLogradouro(logradouro, bairro string) (string, error) {
	const query = `
		SELECT 
			*,
			similarity(logradouro, $1) AS score_rua,
			similarity(bairro, $2) AS score_bairro,
			(
				similarity(logradouro, $1) * 0.9 +
				similarity(bairro, $2) * 0.1
			) AS score_final
		FROM enderecos
		ORDER BY score_final DESC
		LIMIT 1;
		`
	var logradouroScore models.LogradouroScore
	err := repo.connection.Get(&logradouroScore, query, logradouro, bairro)
	return logradouroScore.Regiao, err
}
func (repo EnderecoRepository) GetRegiaoByBairro(bairro string) (string, error) {
	const query = `
		SELECT regiao FROM enderecos
		WHERE unaccent(LOWER(bairro)) ILIKE '%' || unaccent(LOWER($1)) || '%'
		ORDER BY
			CASE WHEN unaccent(LOWER(TRIM(bairro))) = unaccent(LOWER(TRIM($1))) THEN 0 ELSE 1 END,
			LENGTH(bairro) ASC
		LIMIT 1`
	var regiao string
	err := repo.connection.Get(&regiao, query, bairro)
	return regiao, err
}

func (repo EnderecoRepository) FindCandidatosPorPalavras(palavras []string, bairro string, limit int) ([]models.Logradouro, error) {
	if len(palavras) == 0 {
		return nil, fmt.Errorf("nenhuma palavra para busca")
	}
	if limit <= 0 {
		limit = 25
	}

	conditions := make([]string, 0, len(palavras))
	args := make([]interface{}, 0, len(palavras)+2)
	for i, palavra := range palavras {
		conditions = append(conditions, fmt.Sprintf("unaccent(LOWER(logradouro)) ILIKE unaccent(LOWER($%d))", i+1))
		args = append(args, "%"+palavra+"%")
	}

	query := fmt.Sprintf(
		`SELECT logradouro, bairro, regiao FROM enderecos WHERE %s`,
		strings.Join(conditions, " AND "),
	)

	argIdx := len(palavras) + 1
	if bairro != "" {
		query += fmt.Sprintf(" AND unaccent(LOWER(bairro)) ILIKE unaccent(LOWER($%d))", argIdx)
		args = append(args, "%"+bairro+"%")
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY LENGTH(logradouro) ASC LIMIT $%d", argIdx)
	args = append(args, limit)

	var candidatos []models.Logradouro
	err := repo.connection.Select(&candidatos, query, args...)
	return candidatos, err
}

func (repo EnderecoRepository) CreateEndereco(endereco models.Endereco) error {
	const query = `INSERT INTO enderecos (logradouro, bairro, regiao) VALUES ($1, $2, $3)`
	_, err := repo.connection.Exec(query, endereco.Logradouro, endereco.Bairro, endereco.Regiao)
	return err
}
