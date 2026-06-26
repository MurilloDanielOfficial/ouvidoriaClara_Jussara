package controllers

import (
	"back-end/usecases"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CategoriaController struct {
	usecase *usecases.CategoriaUseCase
}

func NewCategoriaController(usecase *usecases.CategoriaUseCase) *CategoriaController {
	return &CategoriaController{usecase: usecase}
}

func (c *CategoriaController) GetAllCategorias(ctx *gin.Context){
	categorias, err := c.usecase.GetAllCategorias()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"message":"erro ao buscar categorias", "error":err.Error()})
		fmt.Println("erro ao buscar as categorias: ",err.Error())
		return
	}
	ctx.JSON(http.StatusOK, categorias)
}