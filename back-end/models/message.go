package models

import (
	"fmt"
	"sync"
	"time"
)

type Message struct {
	Id       int    `db:"id" json:"id"`
	Telefone string `db:"telefone" json:"telefone"`
	Conteudo string `db:"conteudo" json:"conteudo"`
}

type AtividadeCliente struct {
	Telefone        string `db:"telefone" json:"telefone"`
	UltimaInteracao string `db:"ultima_interacao" json:"ultimaInteracao"`
	Lembrete10Min   bool   `db:"lembrete_10min" json:"lembrete10Min"`
}

type Sessao struct {
	Respondendo bool
	Mu          sync.Mutex // Mutex para evitar processamento duplicado
}

// Mapa global thread-safe
var Sessoes sync.Map

type Mensagem struct {
	ID         int       `json:"id" db:"id"`
	Telefone   string    `json:"telefone" db:"telefone"`
	Conteudo   string    `json:"conteudo" db:"conteudo"`
	FoiEnviado bool      `json:"foiEnviado" db:"foienviado"`
	CreatedAt  time.Time `json:"createdAt" db:"data"`
	UpdatedAt  time.Time `json:"updatedAt" db:"updated_at"`
}

type AddMensagem struct {
	Telefone string `json:"telefone"`
	Nome     string `json:"nome"`
	Instance string `json:"instance"`
	Conteudo string `json:"conteudo"`
}

type GetMensagensResponse struct {
	Telefone  string `json:"telefone" db:"telefone"`
	Data      string `json:"data" db:"data"`
	Horario   string `json:"horario" db:"horario"`
	DiaSemana string `json:"diaSemana" db:"dia_semana"`
	Mensagem  string `json:"mensagem" db:"mensagem"`
}

type AvisoPlanoAtigido struct {
	Avisado         bool      `json:"avisado" db:"avisado"`
	TelefoneRicardo string    `json:"telefoneRicardo" db:"telefone_ricardo"`
	TelefoneLeo     string    `json:"telefoneLeo" db:"telefone_leo"`
	Data            time.Time `json:"data" db:"data"`
}

type HistoricoChat struct {
	ID        int       `json:"id" db:"id"`
	Telefone  string    `json:"telefone" db:"telefone"`
	Remetente string    `json:"remetente" db:"remetente"`
	Conteudo  string    `json:"conteudo" db:"conteudo"`
	Tipo      string    `json:"tipo" db:"tipo"`
	LinkMidia string    `json:"linkMidia" db:"link_midia"`
	CriadoEm  time.Time `json:"criadoEm" db:"criado_em"`
}

type AddMensagemIA struct {
	Telefone string `json:"telefone"`
	Conteudo string `json:"conteudo"`
}

func (a *AddMensagemIA) Print() {
	fmt.Println("AddMensagemIA")
	fmt.Println("Telefone: ", a.Telefone)
	fmt.Println("Conteudo: ", a.Conteudo)
}

type AddMensagemAgente struct {
	Telefone string `json:"telefone"`
	Conteudo string `json:"conteudo"`
}

func (a *AddMensagemAgente) Print() {
	fmt.Println("AddMensagemAgente")
	fmt.Println("Telefone: ", a.Telefone)
	fmt.Println("Conteudo: ", a.Conteudo)
}

type MensagemHistorico struct {
	ID        int       `json:"id" db:"id"`
	Remetente string    `json:"remetente" db:"remetente"`
	Conteudo  string    `json:"conteudo" db:"conteudo"`
	Tipo      string    `json:"tipo" db:"tipo"`
	LinkMidia string    `json:"linkMidia" db:"link_midia"`
	CriadoEm  time.Time `json:"criadoEm" db:"criado_em"`
}

type HistoricoChatResponse struct {
	Telefone  string              `json:"telefone"`
	Nome      string              `json:"nome"`
	Mensagens []MensagemHistorico `json:"mensagens"`
	Janela    JanelaAtendimento   `json:"janela"`
}

// JanelaAtendimento é a janela de 24h da Meta: aberta = pode mandar texto livre.
type JanelaAtendimento struct {
	Aberta            bool  `json:"aberta"`
	SegundosRestantes int64 `json:"segundosRestantes"`
}

type EnviarTemplateAgente struct {
	Telefone string `json:"telefone"`
}

type ConversaResumo struct {
	Telefone        string    `json:"telefone" db:"telefone"`
	Nome            string    `json:"nome" db:"nome"`
	UltimaMensagem  string    `json:"ultimaMensagem" db:"ultima_mensagem"`
	RemetenteUltima string    `json:"remetenteUltima" db:"remetente_ultima"`
	TipoUltima      string    `json:"tipoUltima" db:"tipo_ultima"`
	CriadoEm        time.Time `json:"criadoEm" db:"criado_em"`
}
