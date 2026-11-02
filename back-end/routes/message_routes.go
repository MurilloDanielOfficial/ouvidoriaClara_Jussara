package routes

import (
	"back-end/controllers"

	"github.com/gin-gonic/gin"
)

func SetMessageRoutes(router *gin.Engine, messageController *controllers.MensagemController) {
	router.POST("/addMessage", messageController.AddMensagem)
	router.GET("/getMessages/:telefone", messageController.GetMessagesByTelefone)
	router.DELETE("/clearMessages/:telefone", messageController.ClearMessagesByTelefone)
	router.POST("/chat/mensagem-ia", messageController.AddMensagemIA)
	router.POST("/chat/midia", messageController.UploadMidiaChat)
	router.POST("/chat/mensagem-agente", messageController.AddMensagemAgente)
	router.POST("/chat/template-agente", messageController.EnviarTemplateAgente)
	router.GET("/chat", messageController.ListConversas)
	router.GET("/chat/:telefone", messageController.GetHistoricoChat)
}
