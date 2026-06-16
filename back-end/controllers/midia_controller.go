package controllers

import (
	"back-end/usecases"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type MidiaController struct {
	useCase *usecases.MidiaUseCases
}

func NewMidiaController(usecase *usecases.MidiaUseCases) *MidiaController {
	return &MidiaController{
		useCase: usecase,
	}
}

func (c MidiaController) UploadMidia(ctx *gin.Context) {
	baseUrl := os.Getenv("BASE_URL_UPLOAD")

	file, err := ctx.FormFile("midia")
	if err != nil {
		ctx.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Erro ao receber o arquivo", "error": err.Error()})
		fmt.Println(err.Error())
		return
	}

	envUploadDir := os.Getenv("UPLOAD_DIR")
	uniqueName := fmt.Sprintf("%v_%s", time.Now().Unix(), file.Filename)
	filePath := filepath.Join("/var/www/html/clientes", envUploadDir, uniqueName)

	if err := ctx.SaveUploadedFile(file, filePath); err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"message": "Erro ao salvar o arquivo", "error": err.Error()})
		fmt.Println("erro ao salvar midia: " + err.Error())
		return
	}

	imageURL := fmt.Sprintf("%s/uploads/%s", baseUrl, url.PathEscape(uniqueName))
	if err := c.useCase.UploadMidia(imageURL); err != nil {
		ctx.IndentedJSON(http.StatusInternalServerError, gin.H{"message": "Erro ao salvar o link no banco de dados", "error": err.Error()})
		return
	}
	ctx.IndentedJSON(http.StatusOK, gin.H{"message": "Arquivo carregado com sucesso", "file_path": filePath})
}
