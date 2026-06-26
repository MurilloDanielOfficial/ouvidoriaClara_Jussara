package routes

import (
	"back-end/controllers"

	"github.com/gin-gonic/gin"
)

func SetupCategoriaRoutes(router *gin.Engine, ctrl controllers.CategoriaController){
	router.GET("/categorias", ctrl.GetAllCategorias)
}