package models

type RequestData struct {
	Reclamacao string `json:"reclamacao" binding:"required"`
	Nome       string `json:"nome" binding:"required"`
	Telefone   string `json:"telefone" binding:"required"`
	Categoria  string `json:"categoria" binding:"required"`
	Regiao     int    `json:"regiao" binding:"required"`
}

type Inquerito struct {
	ID         int    `db:"id"`
	Reclamacao string `db:"reclamacao"`
	Nome       string `db:"nome"`
	Telefone   string `db:"telefone"`
	Categoria  string `db:"categoria"`
	Regiao     int    `db:"regiao"`
}

type Reclamacao struct {
	ID          int                `json:"id"`
	Nome        string             `json:"nome"`
	Telefone    string             `json:"telefone"`
	Categoria   string             `json:"categoria"`
	Regiao      int                `json:"regiao"`
	Reclamacao  string             `json:"reclamacao"` //igual situação resumida
	Resolvido   bool               `json:"resolvido"`
	DataCriacao string             `json:"dataCriacao"`
	Tipo        string             `json:"tipo"` //inquerito ou requerimento
	Status      string             `json:"status"`
	Protocolo   *int               `json:"num_protocolo"`
	Detalhes    DetalhesReclamacao `json:"detalhe"`
}

type OcorrenciaRequest struct {
	Telefone              string `json:"telefone"`
	NomeCliente           string `json:"nomeCliente"`
	EnderecoCliente       string `json:"enderecoCliente"`
	BairroCliente         string `json:"bairroCliente"`
	CidadeCliente         string `json:"cidadeCliente"`
	DataNascimentoCliente string `json:"dataNascimentoCliente"`
	SituacaoResumida      string `json:"situacaoResumida"`
	Categoria             string `json:"categoria"`
	EhManual              bool   `json:"ehManual"`
	DetalhesReclamacao
}

type OcorrenciaData struct {
	Telefone   string             `json:"telefone"`
	Categoria  string             `json:"categoria"`
	Reclamacao string             `json:"reclamacao"`
	Regiao     string             `json:"regiao"`
	EhManual   bool               `json:"ehManual"`
	Detalhes   DetalhesReclamacao `json:"detalhes"`
}

type Ocorrencia struct {
	ID               int                `json:"id"`
	Telefone         string             `json:"telefone"`
	Categoria        string             `json:"categoria"`
	SituacaoResumida string             `json:"situacaoResumida"`
	Tipo             string             `json:"tipo"`
	Status           string             `json:"status"`
	Detalhes         DetalhesReclamacao `json:"detalhes"`
	EhManual         bool               `json:"ehManual"`
	DataCriacao      string             `json:"dataCriacao"`
	DataAtualizacao  string             `json:"dataAtualizacao"`
}

type OcorrenciaUpdateRequest struct {
	SituacaoResumida string `json:"situacaoResumida"`
	Categoria        string `json:"categoria"`
	Status           string `json:"status"`
	DetalhesReclamacao
}

type Atualizacao struct {
	NovaReclamacao string `json:"novaReclamacao" binding:"required"`
}

// DetalhesReclamacao armazena os campos extras coletados pela IA (prompt_v2.xml)
// no JSONB "detalhes" da tabela reclamacao. Cada fluxo preenche apenas o subconjunto relevante.
type DetalhesReclamacao struct {
	// Maus-tratos
	EnderecoOcorrencia   string `json:"enderecoOcorrencia,omitempty"`
	ConheceTutor         string `json:"conheceTutor,omitempty"`
	CondicoesAnimal      string `json:"condicoesAnimal,omitempty"`
	FrequenciaMausTratos string `json:"frequenciaMausTratos,omitempty"`

	// Dados do animal (abandono, comunitário, desaparecido, adoção, castração, silvestres)
	NomeAnimal                string `json:"nomeAnimal,omitempty"`
	EspecieAnimal             string `json:"especieAnimal,omitempty"`
	IdadeAnimal               string `json:"idadeAnimal,omitempty"`
	SexoAnimal                string `json:"sexoAnimal,omitempty"`
	BairroAnimal              string `json:"bairroAnimal,omitempty"`
	NomeResponsavelAnimal     string `json:"nomeResponsavelAnimal,omitempty"`
	TelefoneResponsavelAnimal string `json:"telefoneResponsavelAnimal,omitempty"`
	HistoricoAnimal           string `json:"historicoAnimal,omitempty"`

	// Saúde animal
	TemCadUnico            string `json:"temCadUnico,omitempty"`
	EhProtetorIndependente string `json:"ehProtetorIndependente,omitempty"`
	SituacaoAnimal         string `json:"situacaoAnimal,omitempty"`

	// Castração emergencial
	QuandoCruzou    string `json:"quandoCruzou,omitempty"`
	InfoSaudeAnimal string `json:"infoSaudeAnimal,omitempty"`

	// Animais não domiciliados
	DetalhesDenuncia string `json:"detalhesDenuncia,omitempty"`

	// Animais silvestres
	TempoAnimalLocal   string `json:"tempoAnimalLocal,omitempty"`
	FerimentosAnimal   string `json:"ferimentosAnimal,omitempty"`
	ProvidenciasAnimal string `json:"providenciasAnimal,omitempty"`

	// Comum a fluxos com mídia e/ou protocolo de denúncia
	MidiasAnimal      string `json:"midiasAnimal,omitempty"`
	ProtocoloDenuncia string `json:"protocoloDenuncia,omitempty"`

	Regiao string `json:"regiao,omitempty"`
}
