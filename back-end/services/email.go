package services

import (
	"back-end/models"
	"log"
	"os"

	"gopkg.in/gomail.v2"
)

func emailDestino() string {
	if to := os.Getenv("EMAIL_DESTINO"); to != "" {
		return to
	}
	return "darwinartificialintelligence@gmail.com"
}

func SendEmail(to, subject, body, filename string) error {
	from := os.Getenv("EMAIL_FROM")
	pass := os.Getenv("EMAIL_PASS")

	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)
	m.Attach(filename)
	d := gomail.NewDialer("smtp.gmail.com", 587, from, pass)
	return d.DialAndSend(m)
}

func enviaDocumento(filename, assunto, corpo string, gerar func() error) (bool, error) {
	if err := gerar(); err != nil {
		log.Printf("Erro ao gerar PDF: %v", err)
		return false, err
	}
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		log.Printf("Arquivo PDF não foi criado corretamente: %v", err)
		return false, err
	}
	if err := SendEmail(emailDestino(), assunto, corpo, filename); err != nil {
		log.Printf("Erro ao enviar email: %v", err)
		return false, err
	}
	log.Printf("Email enviado com sucesso para %s", emailDestino())
	os.Remove(filename)
	return true, nil
}

func EnviaInquerito(data models.Inquerito) (bool, error) {
	return enviaDocumento("indicacao.pdf", "indicação",
		"Segue em anexo uma indicação requisitada por um munícipe de São Roque, obrigado!.",
		func() error { return GeneratePDF(data) })
}

func EnviaRequerimento(data models.Inquerito) (bool, error) {
	return enviaDocumento("requerimento.pdf", "requerimento",
		"Segue em anexo um requerimento requisitado por um munícipe de São Roque, obrigado!.",
		func() error { return GenerateRequerimento(data) })
}

// func EnviaOficio(data models.Inquerito) (bool, error) {
// 	return enviaDocumento("oficio.pdf", "ofício",
// 		"Segue em anexo um ofício requisitado por um munícipe de São Roque, obrigado!.",
// 		func() error { return GenerateOficio(data) })
// }
