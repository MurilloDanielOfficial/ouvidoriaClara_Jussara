package models

type Regiao struct {
	ID           int            `json:"id"`
	Distribuicao map[string]int `json:"distribuicao"`
}

type Stat struct {
	NumPessoas       int              `json:"numPessoas"` // qtd contatos
	Regioes          []StatsRegiao    `json:"regioes"` //distribuição por regiao
	Categorias       []StatsCategoria `json:"categorias"` // distribuição por categoria
	Tipos            []StatsTipo      `json:"tipos"` // distribuição por tipo 
	PercIndicacao    float64          `json:"percIndicacao"`
	PercRequerimento float64          `json:"percRequerimento"`
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
	//IndicacoesReprovadas int `json:"indicacoesReprovadas" db:"indicacoes_reprovadas"`
	//IndicacoesEmAnalise  int `json:"indicacoesEmAnalise" db:"indicacoes_em_analise"`
	TotalIndicacoes      int `json:"totalIndicacoes" db:"total_indicacoes"`

	RequerimentosAprovadas  int `json:"requerimentosAprovados" db:"requerimentos_aprovados"`
	//RequerimentosReprovados int `json:"requerimentosReprovados" db:"requerimentos_reprovados"`
	//RequerimentosEmAnalise  int `json:"requerimentosEmAnalise" db:"requerimentos_em_analise"`
	TotalRequerimentos      int `json:"totalRequerimentos" db:"total_requerimentos"`

	TotalReclamacoes int `json:"numReclamacoes" db:"total_reclamacao"`
}
