package services

import (
	"back-end/models"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
)

var meses = []string{
	"janeiro", "fevereiro", "março", "abril", "maio", "junho",
	"julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
}

func logoPath() string {
	if path := os.Getenv("LOGO_PATH"); path != "" {
		return path
	}
	return "/root/ouvidoriaClara_Jussara/back-end/img/logo.png"
}

func novoCabecalho(titulo string) *gofpdf.Fpdf {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetMargins(20, 20, 20)

	logoFile := logoPath()
	if _, err := os.Stat(logoFile); os.IsNotExist(err) {
		log.Printf("Atenção: Logo não encontrado em %s", logoFile)
	} else {
		pdf.ImageOptions(logoFile, 20, 15, 170, 30, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
	}

	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.SetFont("Arial", "B", 12)
	pdf.SetXY(60, 50)
	pdf.Cell(90, 10, tr("GABINETE DA VEREADORA JUSSARA FERNANDES"))
	pdf.SetXY(85, 60)
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 10, tr(titulo))
	pdf.Ln(30)
	return pdf
}

func dataExtenso() string {
	now := time.Now()
	return fmt.Sprintf("S/S., %d de %s de %d", now.Day(), meses[now.Month()-1], now.Year())
}

func assinarPDF(pdf *gofpdf.Fpdf, tr func(string) string) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 10, tr("JUSSARA FERNANDES"), "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 10, tr("Vereadora"), "", 1, "C", false, 0, "")
}

func parseIndicacao(text string) (necessidade, considerando1, considerando2, providencias string) {
	parts := strings.Split(text, "$$")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	switch len(parts) {
	case 1:
		necessidade = parts[0]
		providencias = parts[0]
	case 2:
		necessidade = parts[0]
		providencias = parts[1]
	case 3:
		necessidade = parts[0]
		considerando1 = parts[1]
		providencias = parts[2]
	default:
		necessidade = parts[0]
		considerando1 = parts[1]
		considerando2 = parts[2]
		providencias = parts[3]
	}
	return
}

func parseRequerimento(text string) (requer, considerando1, considerando2 string, questoes []string) {
	if !strings.Contains(text, "$$") {
		text = "$$" + text
	}
	parts := strings.Split(text, "$$")
	if parts[0] == "" {
		parts = parts[1:]
	}
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	switch len(parts) {
	case 1:
		questoes = strings.Split(parts[0], "|")
	case 2:
		requer = parts[0]
		questoes = strings.Split(parts[1], "|")
	case 3:
		requer = parts[0]
		considerando1 = parts[1]
		questoes = strings.Split(parts[2], "|")
	default:
		requer = parts[0]
		considerando1 = parts[1]
		considerando2 = parts[2]
		questoes = strings.Split(parts[3], "|")
	}
	return
}

func GeneratePDF(requestData models.Inquerito) error {
	necessidade, considerando1, considerando2, providencias := parseIndicacao(requestData.Reclamacao)

	pdf := novoCabecalho("INDICAÇÃO N.º ___ / " + time.Now().Format("2006"))
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	pdf.SetFont("Arial", "", 11)
	pdf.MultiCell(0, 10, tr("Indica ao Executivo Municipal a necessidade de "+necessidade+"."), "", "", false)
	pdf.Ln(10)

	if considerando1 != "" {
		pdf.MultiCell(0, 10, tr("CONSIDERANDO que "+considerando1+"."), "", "", false)
		pdf.Ln(10)
	}
	if considerando2 != "" {
		pdf.MultiCell(0, 10, tr("CONSIDERANDO "+considerando2+"."), "", "", false)
		pdf.Ln(10)
	}

	pdf.SetX(40)
	pdf.MultiCell(0, 10, tr("INDICO ao Exmo. Sr. Prefeito Municipal, através do setor competente, a tomada de providências visando à / ao "+providencias+"."), "", "", false)
	pdf.Ln(20)

	pdf.SetX(20)
	pdf.Cell(0, 10, tr(dataExtenso()))
	pdf.Ln(20)

	assinarPDF(pdf, tr)

	return pdf.OutputFileAndClose("indicacao.pdf")
}

func GenerateRequerimento(requestData models.Inquerito) error {
	requer, considerando1, considerando2, questoes := parseRequerimento(requestData.Reclamacao)

	pdf := novoCabecalho("REQUERIMENTO N.º ___ / " + time.Now().Format("2006"))
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	pdf.SetFont("Arial", "", 11)
	if requer != "" {
		pdf.MultiCell(0, 10, tr("REQUER "+requer+"."), "", "", false)
		pdf.Ln(10)
	}

	if considerando1 != "" {
		pdf.MultiCell(0, 10, tr("CONSIDERANDO "+considerando1+"."), "", "", false)
		pdf.Ln(10)
	}
	if considerando2 != "" {
		pdf.MultiCell(0, 10, tr("CONSIDERANDO "+considerando2+"."), "", "", false)
		pdf.Ln(10)
	}

	pdf.MultiCell(0, 10, tr("REQUEIRO à Mesa, ouvido o Plenário, seja oficiado ao Excelentíssimo Senhor Prefeito Municipal, solicitando nos informar o que segue:"), "", "", false)
	pdf.Ln(10)

	pdf.SetFont("Arial", "I", 11)
	pdf.Cell(0, 10, tr("(Solicitações - Questionamentos)"))
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 11)
	for i, q := range questoes {
		q = strings.TrimSpace(q)
		if q == "" {
			continue
		}
		pdf.SetX(40)
		pdf.MultiCell(0, 10, tr(fmt.Sprintf("%d) %s", i+1, q)), "", "", false)
		pdf.Ln(5)
	}
	pdf.SetX(20)
	pdf.Ln(15)

	pdf.Cell(0, 10, tr(dataExtenso()))
	pdf.Ln(20)

	assinarPDF(pdf, tr)

	return pdf.OutputFileAndClose("requerimento.pdf")
}

// func GenerateOficio(requestData models.Inquerito) error {
// 	now := time.Now()
// 	pdf := novoCabecalho("OFÍCIO N.º ___ / " + now.Format("2006"))
// 	tr := pdf.UnicodeTranslatorFromDescriptor("")

// 	pdf.SetFont("Arial", "", 11)
// 	pdf.Cell(0, 10, tr("Senhor Presidente,"))
// 	pdf.Ln(15)

// 	pdf.SetFont("Arial", "", 11)
// 	pdf.Write(10, tr("Esta Vereadora, submentendo este documento ao Chefe do Poder Executivo, diretamente ou através de departamento ou divisão competente,"))
// 	pdf.SetFont("Arial", "B", 11)
// 	pdf.Write(10, tr(" OFICIA"))
// 	pdf.SetFont("Arial", "", 11)
// 	pdf.Write(10, tr(" ao Senhor Prefeito Municipal, que "))
// 	pdf.Write(10, tr(requestData.Reclamacao+"."))
// 	pdf.Ln(15)

// 	pdf.SetFont("Arial", "", 11)
// 	pdf.Cell(0, 10, tr("Nestes termos,"))
// 	pdf.Ln(5)
// 	pdf.Cell(0, 10, tr("Aguarda deferimento."))
// 	pdf.Ln(30)

// 	pdf.Cell(0, 10, tr(dataExtenso()))
// 	pdf.Ln(20)

// 	pdf.SetFont("Arial", "B", 11)
// 	pdf.CellFormat(0, 10, tr("VEREADORA JUSSARA FERNANDES"), "", 1, "C", false, 0, "")

// 	return pdf.OutputFileAndClose("oficio.pdf")
// }
