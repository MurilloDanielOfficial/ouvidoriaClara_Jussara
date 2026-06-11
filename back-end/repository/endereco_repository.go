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

func (repo EnderecoRepository) GetRegiaoByLogradouro(logradouro, bairro string) (string, error) {
	const query = `
		SELECT regiao FROM enderecos
		WHERE logradouro ILIKE '%' || $1 || '%'
		  AND ($2 = '' OR bairro ILIKE '%' || $2 || '%')
		ORDER BY
			CASE WHEN LOWER(TRIM(logradouro)) = LOWER(TRIM($1)) THEN 0 ELSE 1 END,
			LENGTH(logradouro) ASC
		LIMIT 1`
	var regiao string
	err := repo.connection.Get(&regiao, query, logradouro, bairro)
	return regiao, err
}
func (repo EnderecoRepository) GetRegiaoByBairro(bairro string) (string, error) {
	const query = `
		SELECT regiao FROM enderecos
		WHERE bairro ILIKE '%' || $1 || '%'
		ORDER BY
			CASE WHEN LOWER(TRIM(bairro)) = LOWER(TRIM($1)) THEN 0 ELSE 1 END,
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
		conditions = append(conditions, fmt.Sprintf("logradouro ILIKE $%d", i+1))
		args = append(args, "%"+palavra+"%")
	}

	query := fmt.Sprintf(
		`SELECT logradouro, bairro, regiao FROM enderecos WHERE %s`,
		strings.Join(conditions, " AND "),
	)

	argIdx := len(palavras) + 1
	if bairro != "" {
		query += fmt.Sprintf(" AND bairro ILIKE $%d", argIdx)
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
