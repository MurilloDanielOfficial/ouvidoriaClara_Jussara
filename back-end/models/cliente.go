package models

import "time"

type Cliente struct {
	Telefone       string    `db:"telefone" json:"telefone"`
	Nome           string    `db:"nome" json:"nome"`
	Cidade         string    `db:"cidade" json:"cidade"`
	Endereco       string    `db:"endereco" json:"endereco"`
	Bairro         string    `db:"bairro" json:"bairro"`
	DataNascimento string    `db:"data_nascimento" json:"data_nascimento"`
	DataCriacao    time.Time `db:"data_criacao" json:"data_criacao"`
}
