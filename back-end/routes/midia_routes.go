package routes

import (
	"back-end/controllers"

	"github.com/gin-gonic/gin"
)

func SetupMidiaRoutes(router *gin.Engine, midiaController *controllers.MidiaController) {
	router.POST("/midia/upload", midiaController.UploadMidia)

}
