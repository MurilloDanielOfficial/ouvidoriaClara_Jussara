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

	//VERIFICACOES DE CLIENTES LIGADOS
	router.POST("/desligar/:telefone", clienteController.DesligaRobo)
	router.DELETE("/ligar/:telefone", clienteController.LigaRobo)
	router.GET("/ligado/:telefone", clienteController.IsRoboLigado)
	
	router.GET("/clientes-gelo", clienteController.GetClientesGelo)
	router.GET("/existe-cliente/:telefone", clienteController.ExisteCliente)

	router.GET("/clientes-gelo", clienteController.GetClientesGelo)
	router.GET("/busca/cliente/:telefoneCliente", clienteController.GetClienteAtivo)
	router.GET("/busca/dados/:telefoneCliente", clienteController.GetDadosCliente)
}
