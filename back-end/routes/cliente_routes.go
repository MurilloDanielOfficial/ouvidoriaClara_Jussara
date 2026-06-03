package routes

import (
	"back-end/controllers"

	"github.com/gin-gonic/gin"
)

func SetupClienteRoutes(router *gin.Engine, clienteController *controllers.ClienteController) {
	router.POST("/cliente", clienteController.CreateCliente)
	router.GET("/cliente/:telefone", clienteController.GetClienteByTelefone)
	router.GET("/clientes", clienteController.GetAllClientes)
	router.PUT("/cliente/:telefone", clienteController.UpdateCliente)
	router.DELETE("/cliente/:telefone", clienteController.DeleteCliente)
}
