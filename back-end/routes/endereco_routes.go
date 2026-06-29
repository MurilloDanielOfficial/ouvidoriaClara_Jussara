package routes

import (
	"back-end/controllers"

	"github.com/gin-gonic/gin"
)

func SetupEnderecoRoutes(router *gin.Engine, enderecoController controllers.EnderecoController) {
	router.GET("/getRegiao", enderecoController.GetRegiao)
	router.POST("/cadastrarEnderecos", enderecoController.CadastrarEnderecos)
	router.PUT("/endereco/:id", enderecoController.UpdateEndereco)
	router.DELETE("/endereco/:id", enderecoController.DeleteEndereco)
	router.GET("/enderecos", enderecoController.GetAllEnderecos)
	router.GET("/endereco/:id", enderecoController.GetEnderecoById)
}
