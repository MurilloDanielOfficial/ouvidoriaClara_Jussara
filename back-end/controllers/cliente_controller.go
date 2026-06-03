package controllers

import (
	"back-end/apperror"
	"back-end/models"
	"back-end/usecases"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ClienteController struct {
	usecase *usecases.ClienteUseCase
}

func NewClienteController(usecase *usecases.ClienteUseCase) *ClienteController {
	return &ClienteController{usecase: usecase}
}

func (ctrl *ClienteController) CreateCliente(c *gin.Context) {
	var cliente models.Cliente
	if err := c.BindJSON(&cliente); err != nil {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Formato inválido.", "error": err.Error()})
		return
	}
	if cliente.Telefone == "" {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Telefone obrigatório."})
		return
	}
	if err := ctrl.usecase.CreateCliente(cliente); err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			c.IndentedJSON(appErr.StatusCode, gin.H{"error": appErr.Message})
			return
		}
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.String(http.StatusCreated, "Cliente criado")
}

func (ctrl *ClienteController) GetClienteByTelefone(c *gin.Context) {
	telefone := c.Param("telefone")
	cliente, err := ctrl.usecase.GetClienteByTelefone(telefone)
	if err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			c.IndentedJSON(appErr.StatusCode, gin.H{"error": appErr.Message})
			return
		}
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.IndentedJSON(http.StatusOK, cliente)
}

func (ctrl *ClienteController) GetAllClientes(c *gin.Context) {
	list, err := ctrl.usecase.GetAllClientes()
	if err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			c.IndentedJSON(appErr.StatusCode, gin.H{"error": appErr.Message})
			return
		}
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.IndentedJSON(http.StatusOK, list)
}

func (ctrl *ClienteController) UpdateCliente(c *gin.Context) {
	telefone := c.Param("telefone")
	var cliente models.Cliente
	if err := c.BindJSON(&cliente); err != nil {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Formato inválido.", "error": err.Error()})
		return
	}
	if err := ctrl.usecase.UpdateCliente(telefone, cliente); err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			c.IndentedJSON(appErr.StatusCode, gin.H{"error": appErr.Message})
			return
		}
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.String(http.StatusOK, "Atualizado")
}

func (ctrl *ClienteController) DeleteCliente(c *gin.Context) {
	telefone := c.Param("telefone")
	if err := ctrl.usecase.DeleteCliente(telefone); err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			c.IndentedJSON(appErr.StatusCode, gin.H{"error": appErr.Message})
			return
		}
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.String(http.StatusOK, "Deletado")
}
