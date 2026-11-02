package repository

import (
	"back-end/models"

	"github.com/jmoiron/sqlx"
)

type MensagemRepo struct {
	db *sqlx.DB
}

func NewMensagemRepo(db *sqlx.DB) *MensagemRepo {
	return &MensagemRepo{db: db}
}

// -------- CONTATO --------
func (r *MensagemRepo) GetContatoByTelefone(telefone string) (*models.Contato, error) {
	return NewContatoRepo(r.db).GetContatoByTelefone(telefone)
}
func (r *MensagemRepo) UpdateInstanciaContato(telefone string, instancia string) error {
	return NewContatoRepo(r.db).UpdateInstanciaContato(telefone, instancia)
}

func (r *MensagemRepo) CreateContato(contato *models.Contato) error {
	return NewContatoRepo(r.db).CreateContato(contato)
}

func (r *MensagemRepo) GetClienteBloqueadoById(telefoneCliente string) error {
	return NewContatoRepo(r.db).GetClienteBloqueadoById(telefoneCliente)
}

func (r *MensagemRepo) GetCountContatos() (int, error) {
	return NewContatoRepo(r.db).GetCountContatos()
}

// -------- ATIVIDADE CLIENTE --------
func (r *MensagemRepo) UpdateUltimaInteracao(telefone string) error {
	const query = `INSERT INTO atividade_clientes (telefone) VALUES ($1) ON CONFLICT (telefone) DO UPDATE SET ultima_interacao = CURRENT_TIMESTAMP`
	_, err := r.db.Exec(query, telefone)
	return err
}

// -------- MENSAGEM --------
func (r *MensagemRepo) CreateMensagem(mensagem *models.Mensagem) error {
	const query = `INSERT INTO mensagens (telefone, conteudo) VALUES ($1, $2) RETURNING id`
	err := r.db.Get(&mensagem.ID, query, mensagem.Telefone, mensagem.Conteudo)
	return err
}
func (r *MensagemRepo) GetMensagensNaoEnviadasBytelefone(telefone string) ([]models.Mensagem, error) {
	const query = `SELECT * FROM mensagens WHERE telefone = $1 AND foienviado = false`
	var mensagens []models.Mensagem
	err := r.db.Select(&mensagens, query, telefone)
	return mensagens, err
}
func (r *MensagemRepo) SetFoiEnviado(id int) error {
	const query = `UPDATE mensagens SET foienviado = true WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
func (r *MensagemRepo) DeleteMensagens(telefone string) error {
	const query = `DELETE FROM mensagens WHERE telefone = $1 AND foienviado = true`
	_, err := r.db.Exec(query, telefone)
	return err
}
func (r *MensagemRepo) GetCountMensagens(telefone string) (int, error) {
	const query = `SELECT COUNT(*) FROM mensagens WHERE telefone = $1 AND foienviado = false`
	var count int
	err := r.db.Get(&count, query, telefone)
	return count, err
}

// -------- BLOQUEIO --------
func (r *MensagemRepo) GetAvisoPlano() (models.AvisoPlanoAtigido, error) {
	const query = `SELECT * FROM aviso_plano_atingido;`
	var aviso models.AvisoPlanoAtigido
	err := r.db.Get(&aviso, query)
	return aviso, err
}

func (r *MensagemRepo) SetAvisado() error {
	const query = `UPDATE aviso_plano_atingido SET avisado = true, data = CURRENT_TIMESTAMP`
	_, err := r.db.Exec(query)
	return err
}

// -------- CAMPANHA --------
func (r *MensagemRepo) GetAllCampanhas() ([]models.Campanha, error) {
	return NewCampanhaRepository(r.db).GetAllCampanhas()
}

// -------- HISTORICO CHAT --------
func (r *MensagemRepo) CreateHistoricoChat(h *models.HistoricoChat) error {
	const query = `INSERT INTO historico_chat (telefone, remetente, conteudo, tipo, link_midia) VALUES ($1, $2, $3, $4, $5) RETURNING id, criado_em`
	return r.db.QueryRow(query, h.Telefone, h.Remetente, h.Conteudo, h.Tipo, h.LinkMidia).Scan(&h.ID, &h.CriadoEm)
}

func (r *MensagemRepo) GetHistoricoByTelefone(telefone string) ([]models.HistoricoChat, error) {
	const query = `SELECT id, telefone, remetente, conteudo, tipo, link_midia, criado_em FROM historico_chat WHERE telefone = $1 ORDER BY criado_em ASC`
	var historico []models.HistoricoChat
	err := r.db.Select(&historico, query, telefone)
	return historico, err
}

// GetSegundosRestantesJanela devolve quantos segundos faltam para fechar a janela de 24h
// (contada da última mensagem do cidadão). Valor <= 0 significa janela fechada.
// O cálculo é feito no próprio Postgres para não sofrer com fuso horário.
// margemMinutos antecipa o fechamento (a mensagem é gravada alguns segundos depois de chegar na Meta).
func (r *MensagemRepo) GetSegundosRestantesJanela(telefone string, margemMinutos int) (int64, error) {
	const query = `
		SELECT COALESCE(
			FLOOR(EXTRACT(EPOCH FROM (MAX(criado_em) + INTERVAL '24 hours' - make_interval(mins => $2) - LOCALTIMESTAMP))),
			0
		)::BIGINT
		FROM historico_chat
		WHERE telefone = $1 AND remetente = 'cliente'`
	var segundos int64
	err := r.db.Get(&segundos, query, telefone, margemMinutos)
	return segundos, err
}

func (r *MensagemRepo) SetClienteBloqueado(telefone string) error {
	const query = `INSERT INTO clientesbloqueados (idcliente) VALUES ($1) ON CONFLICT DO NOTHING`
	_, err := r.db.Exec(query, telefone)
	return err
}

func (r *MensagemRepo) ListConversas() ([]models.ConversaResumo, error) {
	const query = `
		SELECT * FROM (
			SELECT DISTINCT ON (h.telefone)
				h.telefone,
				COALESCE(c.nome, '') AS nome,
				h.conteudo AS ultima_mensagem,
				h.remetente AS remetente_ultima,
				h.tipo AS tipo_ultima,
				h.criado_em
			FROM historico_chat h
			LEFT JOIN contatos c ON c.telefone = h.telefone
			ORDER BY h.telefone, h.criado_em DESC
		) AS conversas
		ORDER BY criado_em DESC`
	var conversas []models.ConversaResumo
	err := r.db.Select(&conversas, query)
	return conversas, err
}
