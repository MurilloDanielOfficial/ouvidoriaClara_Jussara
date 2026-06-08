package controllers

import (
	"back-end/models"
	"back-end/usecases"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ReclamacaoController struct {
	useCase usecases.ReclamacaoUseCases
}

func NewReclamacaoController(usecase usecases.ReclamacaoUseCases) ReclamacaoController {
	return ReclamacaoController{useCase: usecase}
}

func (ctrl ReclamacaoController) CriarReclamacao(c *gin.Context) {
	var data models.RequestData
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Todos os campos são obrigatórios"})
		return
	}
	if err := ctrl.useCase.CreateReclamacao(data); err != nil {
		if err.Error() == "Categoria inválida" {
			c.JSON(http.StatusOK, gin.H{"error": "Categoria inválida"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Solicitação enviada com sucesso!"})
}

func (ctrl ReclamacaoController) EditarReclamacao(c *gin.Context) {
	id := c.Param("id")
	var data models.Atualizacao
	if err := c.BindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Formato inválido.", "error": err.Error()})
		return
	}
	if err := ctrl.useCase.EditarReclamacao(id, data.NovaReclamacao); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Reclamação editada com sucesso!"})
}

func (ctrl ReclamacaoController) GetAllReclamacoes(c *gin.Context) {
	reclamacoes, err := ctrl.useCase.GetAllReclamacoes()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.IndentedJSON(http.StatusOK, reclamacoes)
}

func (ctrl ReclamacaoController) AprovarInquerito(c *gin.Context) {
	if err := ctrl.useCase.AprovarInquerito(c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Inquerito aprovado e enviado com sucesso!"})
}

func (ctrl ReclamacaoController) AprovarRequerimento(c *gin.Context) {
	if err := ctrl.useCase.AprovarRequerimento(c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Requerimento aprovado e enviado com sucesso!"})
}

// func (ctrl ReclamacaoController) AprovarOficio(c *gin.Context) {
// 	if err := ctrl.useCase.AprovarOficio(c.Param("id")); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"message": "Ofício aprovado e enviado com sucesso!"})
// }

func (ctrl ReclamacaoController) AprovarComoAmbos(c *gin.Context) {
	if err := ctrl.useCase.AprovarComoAmbos(c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Inqueritos aprovados e enviados com sucesso!"})
}

func (ctrl ReclamacaoController) ReprovarInquerito(c *gin.Context) {
	if err := ctrl.useCase.ReprovarInquerito(c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Inquerito reprovado com sucesso!"})
}
