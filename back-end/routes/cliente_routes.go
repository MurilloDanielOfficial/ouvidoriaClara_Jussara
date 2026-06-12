package routes

import (
	"back-end/controllers"

	"github.com/gin-gonic/gin"
)

func SetupClienteRoutes(router *gin.Engine, clienteController *controllers.ClienteController) {
	router.POST("/cliente", clienteController.CreateCliente)
	router.POST("/dify/cliente", clienteController.CreateClienteDify)
	router.GET("/cliente/:telefone", clienteController.GetClienteByTelefone)
	router.GET("/clientes", clienteController.GetAllClientes)
	router.GET("/cliente/existe/:telefone", clienteController.ClienteExiste)
	router.PUT("/cliente/:telefone", clienteController.UpdateCliente)
	router.DELETE("/cliente/:telefone", clienteController.DeleteCliente)
}
