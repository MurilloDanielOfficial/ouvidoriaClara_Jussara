package main

import (
	"back-end/config"
	"back-end/controllers"
	"back-end/database"
	"back-end/repository"
	"back-end/routes"
	"back-end/usecases"
	"bytes"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func CleanJSONMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		contentType := c.GetHeader("Content-Type")
		if strings.HasPrefix(contentType, "multipart/form-data") {
			c.Next()
			return
		}

		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			body, _ := io.ReadAll(c.Request.Body)
			body = cleanJSONBody(body)
			body = cleanJSONBody(body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
		}
		c.Next()
	}
}

func cleanJSONBody(body []byte) []byte {
	removals := [][]byte{
		{0xC2, 0xA0},
		{0xE2, 0x80, 0x8B},
		{0xE2, 0x80, 0x8C},
		{0xE2, 0x80, 0x8D},
		{0xE2, 0x80, 0x8E},
		{0xE2, 0x80, 0x8F},
		{0xEF, 0xBB, 0xBF},
	}
	for _, pattern := range removals {
		body = bytes.ReplaceAll(body, pattern, []byte{})
	}
	body = bytes.ReplaceAll(body, []byte{0x0D}, []byte{})
	body = bytes.ReplaceAll(body, []byte{0x09}, []byte{})
	body = bytes.ReplaceAll(body, []byte{0x0B}, []byte{})
	body = bytes.ReplaceAll(body, []byte{0x0C}, []byte{})
	return body
}

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("Error loading .env file")
		panic(err)
	}

	gin.SetMode(gin.ReleaseMode)
	server := gin.Default()

	dbConnection, err := database.ConnectDB()
	if err != nil {
		panic(err)
	}

	server.Use(CORSMiddleware())
	server.Use(CleanJSONMiddleware())

	go config.RelatorioDiario(dbConnection)
	go config.RelatorioGelando(dbConnection)
	go config.RelatorioMensal(dbConnection)
	go config.CheckInativos10Min(dbConnection)
	go config.CheckInativos1Day(dbConnection)

	enderecoUC := usecases.NewEnderecoUseCases(repository.NewEnderecoRepository(dbConnection))
	routes.SetupReclamacaoRoutes(server, controllers.NewReclamacaoController(usecases.NewReclamacaoUseCases(repository.NewReclamacaoRepository(dbConnection), enderecoUC)))
	routes.SetupEnderecoRoutes(server, controllers.NewEnderecoController(enderecoUC))
	routes.SetupProtocoloRoutes(server, controllers.NewProtocoloController(usecases.NewProtocoloUseCases(repository.NewProtocoloRepository(dbConnection))))
	routes.SetupStatsRoutes(server, controllers.NewStatsController(usecases.NewStatsUseCases(repository.NewStatsRepository(dbConnection))))

	routes.SetMessageRoutes(server, controllers.NewMensagemController(usecases.NewMensagemUseCase(*repository.NewMensagemRepo(dbConnection))))
	routes.SetupContactRoutes(server, *controllers.NewContatoController(usecases.NewContatoUseCase(*repository.NewContatoRepo(dbConnection))))

	routes.SetUsuarioRoutes(server, controllers.NewUsuarioController(usecases.NewUsuarioUseCases(repository.NewUsuarioRepository(dbConnection))))
	routes.SetupLeadRoutes(server, controllers.NewLeadController(usecases.NewLeadUseCases(repository.NewLeadRepository(dbConnection))))

	routes.SetupClienteRoutes(server, controllers.NewClienteController(usecases.NewClienteUseCase(repository.NewClienteRepo(dbConnection))))

	portBack := os.Getenv("PORT")
	fmt.Println("Servidor rodando na porta: ", portBack)
	server.Run(":" + portBack)
}
