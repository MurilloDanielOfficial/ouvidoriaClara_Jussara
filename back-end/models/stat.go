package models

type Regiao struct {
	ID           int            `json:"id"`
	Distribuicao map[string]int `json:"distribuicao"`
}

type Stat struct {
	NumPessoas             int              `json:"numPessoas"`
	NumReclamacoes         int              `json:"numReclamacoes"`
	Regioes                []StatsRegiao    `json:"regioes"`
	Categorias             []StatsCategoria `json:"categorias"`
	Tipos                  []StatsTipo      `json:"tipos"`
	PercIndicacao          float64          `json:"percIndicacao"`
	StatsByTipoAndStatus
}

type StatsCategoria struct {
	Categoria    string `json:"categoria" db:"categoria"`
	QtdCategoria int    `json:"qtdCategoria" db:"qtd_categoria"`
}

type StatsRegiao struct {
	Regiao    string `json:"regiao" db:"regiao"`
	QtdRegiao int    `json:"qtdRegiao" db:"qtd_regiao"`
}
type StatsTipo struct {
	Tipo      string `json:"tipo" db:"tipo"`
	QtdRegiao int    `json:"qtdTipo" db:"qtd_tipo"`
}
type StatsByTipoAndStatus struct {
	IndicacoesAprovadas  int `json:"indicacoesAprovadas" db:"indicacoes_aprovadas"`
	IndicacoesReprovadas int `json:"indicacoesReprovadas" db:"indicacoes_reprovadas"`
	IndicacoesEmAnalise  int `json:"indicacoesEmAnalise" db:"indicacoes_em_analise"`
	TotalIndicacoes      int `json:"totalIndicacoes" db:"total_indicacoes"`

	RequerimentosAprovadas  int `json:"requerimentosAprovados" db:"requerimentos_aprovados"`
	RequerimentosReprovados int `json:"requerimentosReprovados" db:"requerimentos_reprovados"`
	RequerimentosEmAnalise  int `json:"requerimentosEmAnalise" db:"requerimentos_em_analise"`
	TotalRequerimentos      int `json:"totalRequerimentos" db:"total_requerimentos"`
}
