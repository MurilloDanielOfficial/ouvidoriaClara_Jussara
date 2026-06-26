package models

type Categoria struct{
	CategoriaId int `json:"id" db:"id"`
	Descricao string `json:"descricao" db:"descricao"`
}