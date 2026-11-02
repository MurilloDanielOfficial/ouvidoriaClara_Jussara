package controllers

import (
	"back-end/models"
	"back-end/services"
	"back-end/usecases"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type MensagemController struct {
	usecase *usecases.MensagemUseCase
}

func NewMensagemController(usecase *usecases.MensagemUseCase) *MensagemController {
	return &MensagemController{usecase: usecase}
}

func (ctrl *MensagemController) AddMensagem(c *gin.Context) {
	var addMensagem models.AddMensagem
	if err := c.ShouldBindJSON(&addMensagem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao receber request em AddMensagem: " + err.Error()})
		return
	}
	err := ctrl.usecase.AddMensagem(&addMensagem)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao adicionar mensagem: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mensagem adicionada com sucesso"})
}

func (ctrl *MensagemController) GetMessagesByTelefone(c *gin.Context) {
	telefone := c.Param("telefone")
	menssagens, err := ctrl.usecase.GetMensagens(telefone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar mensagens: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mensagem": menssagens})
}

func (ctrl *MensagemController) ClearMessagesByTelefone(c *gin.Context) {
	telefone := c.Param("telefone")
	err := ctrl.usecase.DeleteMensagens(telefone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao apagar mensagens: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mensagens apagadas com sucesso"})
}

func (ctrl *MensagemController) AddMensagemIA(c *gin.Context) {
	var body models.AddMensagemIA
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao receber request em AddMensagemIA: " + err.Error()})
		return
	}
	body.Print()
	err := ctrl.usecase.SalvarMensagemIA(body.Telefone, body.Conteudo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar mensagem IA: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mensagem IA salva com sucesso"})
}

func (ctrl *MensagemController) AddMensagemAgente(c *gin.Context) {
	var body models.AddMensagemAgente
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao receber request em AddMensagemAgente: " + err.Error()})
		return
	}
	body.Print()
	historico, err := ctrl.usecase.EnviarMensagemAgente(body.Telefone, body.Conteudo)
	if err != nil {
		if errors.Is(err, services.ErrJanelaFechada) {
			c.JSON(http.StatusConflict, gin.H{
				"error":  "A janela de 24h está fechada. O WhatsApp só permite enviar a mensagem modelo aprovada.",
				"codigo": "JANELA_FECHADA",
			})
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "Erro ao enviar mensagem do agente: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, historico)
}

// EnviarTemplateAgente manda a mensagem modelo de retomada (usada com a janela de 24h fechada).
func (ctrl *MensagemController) EnviarTemplateAgente(c *gin.Context) {
	var body models.EnviarTemplateAgente
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Telefone) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Telefone não informado"})
		return
	}
	historico, err := ctrl.usecase.EnviarTemplateRetomada(body.Telefone)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, historico)
}

func (ctrl *MensagemController) GetHistoricoChat(c *gin.Context) {
	telefone := c.Param("telefone")
	historico, err := ctrl.usecase.GetHistoricoChat(telefone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar historico: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, historico)
}

func (ctrl *MensagemController) UploadMidiaChat(c *gin.Context) {
	telefone := c.PostForm("telefone")
	if telefone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Telefone não informado"})
		return
	}

	remetente := c.PostForm("remetente")
	if remetente == "" {
		remetente = "cliente"
	}

	file, err := c.FormFile("midia")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao receber o arquivo: " + err.Error()})
		return
	}

	tipo := tipoMidiaPorExtensao(file.Filename)
	if tipo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de arquivo não suportado"})
		return
	}

	uniqueName := fmt.Sprintf("%v_%s", time.Now().Unix(), file.Filename)
	filePath := filepath.Join("/var/www/html/clientes", os.Getenv("UPLOAD_DIR"), uniqueName)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar o arquivo: " + err.Error()})
		return
	}

	linkMidia := fmt.Sprintf("%s/%s", os.Getenv("BASE_URL_UPLOAD"), url.PathEscape(uniqueName))

	fmt.Println("Link Midia: ", linkMidia)
	fmt.Println("Telefone: ", telefone)
	fmt.Println("Remetente: ", remetente)
	fmt.Println("Tipo: ", tipo)
	historico, err := ctrl.usecase.SalvarMidiaChat(telefone, remetente, tipo, linkMidia, c.PostForm("conteudo"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar midia no historico: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, historico)
}

func tipoMidiaPorExtensao(nomeArquivo string) string {
	switch strings.ToLower(filepath.Ext(nomeArquivo)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return "imagem"
	case ".ogg", ".oga", ".opus", ".mp3", ".m4a", ".wav", ".aac", ".amr":
		return "audio"
	case ".mp4", ".webm", ".mov", ".avi", ".wmv", ".flv", ".mkv":
		return "video"
	case ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx":
		return "documento"
	}
	return ""
}

func (ctrl *MensagemController) ListConversas(c *gin.Context) {
	conversas, err := ctrl.usecase.ListConversas()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar conversas: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, conversas)
}
