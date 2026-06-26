package repository

import (
	"back-end/models"

	"github.com/jmoiron/sqlx"
)

type CategoriaRepo struct {
	db *sqlx.DB
}

func NewCategoriaRepo(db *sqlx.DB) *CategoriaRepo {
	return &CategoriaRepo{db: db}
}

func (r *CategoriaRepo) CreateCategoria(c models.Categoria) (int, error) {
	const query = `INSERT INTO cliente (descricao) VALUES ($1) RETURNING id;`
	var id int
	err := r.db.Get(&id, query, c.Descricao)
	return id, err
}

func (r *CategoriaRepo) GetAllCategorias() ([]models.Categoria, error){
	const query = `SELECT * FROM categoria`
	var categorias []models.Categoria
	err := r.db.Select(&categorias, query)
	return categorias, err
}