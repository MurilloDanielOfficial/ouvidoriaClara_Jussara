package controllers

import (
	"back-end/apperror"
	"back-end/models"
	"back-end/usecases"
	"database/sql"
	"errors"
	"fmt"
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
	if _, err := ctrl.usecase.CreateCliente(cliente); err != nil {
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

func (ctrl *ClienteController) ClienteExiste(c *gin.Context) {
	telefone := c.Param("telefone")
	existe, cliente, err := ctrl.usecase.ClienteExiste(telefone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		fmt.Println(err.Error())
		return
	}

	if !existe {
		c.JSON(http.StatusOK, existe)
		return
	}
	c.JSON(http.StatusOK, cliente)
}

func (ctrl *ClienteController) CreateClienteDify(c *gin.Context) {
	var cliente models.Cliente
	if err := c.ShouldBindJSON(&cliente); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos", "valido": false, "details": err.Error()})
		fmt.Println("Erro ao bindar cliente:", err)
		return
	}

	err := ctrl.usecase.CreateClienteDify(&cliente)
	if err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) {
			fmt.Println("erro ao criar cliente: ", err)
			c.JSON(appErr.StatusCode, gin.H{"error": appErr.Message})
		} else {
			fmt.Println("erro ao criar cliente: ", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar cliente", "valido": false, "details": err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, gin.H{"telefone": cliente.Telefone, "message": "Cliente criado com sucesso", "valido": true})
}

//VERIFICACOES DE CLIENTES LIGADOS
func (controller ClienteController) IsRoboLigado(c *gin.Context) {
	telefone := c.Param("telefone")

	err := controller.usecase.GetClienteBloqueadoById(telefone)
	if err != nil {
		if err == sql.ErrNoRows {
			c.String(http.StatusOK, "true") // Robô está ligado
			return
		}
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": "Erro ao verificar status", "details": err.Error()})
		return
	}
	c.String(http.StatusOK, "false") // Robô está desligado
}

func (controller ClienteController) DesligaRobo(c *gin.Context) {
	telefone := c.Param("telefone")
	err := controller.usecase.SetClienteBloqueado(telefone)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"valido": false, "error": err.Error()})
		return
	}
	c.IndentedJSON(http.StatusOK, gin.H{"valido": true, "message": fmt.Sprintf("Robo desligado para o número: %s.", telefone)})
}

func (controller ClienteController) LigaRobo(c *gin.Context) {
	telefone := c.Param("telefone")
	err := controller.usecase.DeleteClienteBloqueadoByID(telefone)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"valido": false, "error": err.Error()})
		return
	}
	c.IndentedJSON(http.StatusOK, gin.H{"valido": true, "message": fmt.Sprintf("Robo ligado para o número: %s.", telefone)})
}

func (controller ClienteController) GetClientesGelo(c *gin.Context) {
	gelos, err := controller.usecase.GetClientesGelo()
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		fmt.Println(err)
		return
	}
	c.IndentedJSON(http.StatusOK, gelos)
}

func (controller ClienteController) ExisteCliente(c *gin.Context) {
	telefone := c.Param("telefone")
	existe, err := controller.usecase.ExisteCliente(telefone)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		fmt.Println(err.Error())
		return
	}
	c.IndentedJSON(http.StatusOK, existe)
}

func (controller ClienteController) GetClienteAtivo(c *gin.Context) {
	telefone := c.Param("telefoneCliente")

	ativo, err := controller.usecase.GetClienteAtivo(telefone)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.IndentedJSON(http.StatusOK, gin.H{"ativo": ativo})
}

func (controller ClienteController) GetDadosCliente(c *gin.Context) {
	telefone := c.Param("telefoneCliente")
	dados, err := controller.usecase.GetDadosCliente(telefone)
	if err != nil {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.IndentedJSON(http.StatusOK, gin.H{"resultado": dados})
}