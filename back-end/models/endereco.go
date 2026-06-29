package models

type Endereco struct {
	Logradouro string `json:"Logradouro"`
	Bairro     string `json:"Bairro"`
	Regiao     string    `json:"Região"`
}

type Logradouro struct {
	Id         int    `db:"id" json:"id"`
	Logradouro string `db:"logradouro" json:"logradouro"`
	Bairro     string `db:"bairro" json:"bairro"`
	Regiao     string `db:"regiao" json:"regiao"`
}

type LogradouroScore struct {
	Logradouro
	ScoreBairro float64 `db:"score_bairro" json:"scoreBairro"`
	ScoreRua    float64 `db:"score_rua" json:"scoreRua"`
	ScoreFinal  float64 `db:"score_final" json:"scoreFinal"`
}
