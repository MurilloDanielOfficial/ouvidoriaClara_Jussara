package controllers

import (
	"back-end/models"
	"back-end/usecases"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type EnderecoController struct {
	useCase usecases.EnderecoUseCases
}

func NewEnderecoController(usecase usecases.EnderecoUseCases) EnderecoController {
	return EnderecoController{useCase: usecase}
}

func (ctrl EnderecoController) GetRegiao(c *gin.Context) {
	input := c.Query("rua")
	regiao := ctrl.useCase.GetRegiao(input)
	c.JSON(http.StatusOK, regiao)
}

func (ctrl EnderecoController) CadastrarEnderecos(c *gin.Context) {
	var data []models.Endereco
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Formato inválido.", "error": err.Error()})
		return
	}
	if err := ctrl.useCase.CadastrarEnderecos(data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Endereço cadastrado com sucesso!"})
}

func (ctrl EnderecoController) GetAllEnderecos(c *gin.Context){
	enderecos, err := ctrl.useCase.GetAllEnderecos()
	if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"enderecos": enderecos})
}
func (ctrl EnderecoController) GetEnderecoById(c *gin.Context){
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message":"id deve ser numerico", "error":err.Error()})
		return
	}
	enderecos, err := ctrl.useCase.GetEnderecoById(id)
	if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"enderecos": enderecos})
}

func (ctrl EnderecoController) UpdateEndereco(c *gin.Context){
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message":"id deve ser numerico", "error":err.Error()})
		return
	}

	var data models.Logradouro
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Formato inválido.", "error": err.Error()})
		return
	}
	if err := ctrl.useCase.UpdateEndereco(id, data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
}

func (ctrl EnderecoController) DeleteEndereco(c *gin.Context){
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message":"id deve ser numerico", "error":err.Error()})
		return
	}
	if err := ctrl.useCase.DeleteEndereco(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
}