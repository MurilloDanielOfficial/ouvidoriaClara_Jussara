package usecases

import (
	"back-end/models"
	"back-end/repository"
	"strings"
	"unicode"
)

type EnderecoUseCases struct {
	repository repository.EnderecoRepository
}

func NewEnderecoUseCases(repo repository.EnderecoRepository) EnderecoUseCases {
	return EnderecoUseCases{repository: repo}
}

var frasesIrrelevantes = []string{
	"em frente ao número", "altura do número", "altura do", "próximo à",
	"próximo ao", "final do", "início da", "em frente", "perto de",
	"perto do", "ao lado de", "na esquina com", "número", "prox",
}

var prefixosLogradouro = []string{
	"rua ", "r. ", "r ", "avenida ", "av. ", "av ", "travessa ", "trav. ", "tr ",
	"alameda ", "al. ", "rodovia ", "rod. ", "praça ", "praca ", "beco ",
}

var stopwords = map[string]bool{
	"rua": true, "r": true, "avenida": true, "av": true, "travessa": true,
	"tr": true, "alameda": true, "rodovia": true, "praça": true, "praca": true,
	"beco": true, "de": true, "da": true, "do": true, "dos": true, "das": true,
}

func parseEndereco(input string) (logradouro, bairro string) {
	input = strings.ToLower(input)
	for _, frase := range frasesIrrelevantes {
		if idx := strings.Index(input, frase); idx != -1 {
			input = strings.TrimSpace(input[:idx])
			break
		}
	}

	partes := strings.Split(input, ",")
	logradouro = strings.TrimSpace(partes[0])
	if len(partes) > 1 {
		candidato := strings.TrimSpace(partes[1])
		if candidato != "" && !somenteDigitos(candidato) {
			bairro = candidato
		}
	}
	return logradouro, bairro
}

func somenteDigitos(s string) bool {
	for _, r := range s {
		if !unicode.IsDigit(r) && !unicode.IsSpace(r) {
			return false
		}
	}
	return true
}

func normalizarLogradouro(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func palavrasSignificativas(s string) []string {
	s = normalizarLogradouro(s)
	palavras := strings.Fields(s)
	resultado := make([]string, 0, len(palavras))
	for _, p := range palavras {
		if len(p) < 3 || stopwords[p] {
			continue
		}
		resultado = append(resultado, p)
	}
	return resultado
}

func levenshteinDistance(s1, s2 string) int {
	s1 = strings.ToLower(s1)
	s2 = strings.ToLower(s2)

	rows := len(s1) + 1
	cols := len(s2) + 1
	matrix := make([][]int, rows)
	for i := 0; i < rows; i++ {
		matrix[i] = make([]int, cols)
		matrix[i][0] = i
	}
	for j := 1; j < cols; j++ {
		matrix[0][j] = j
	}
	for i := 1; i < rows; i++ {
		for j := 1; j < cols; j++ {
			cost := 1
			if s1[i-1] == s2[j-1] {
				cost = 0
			}
			matrix[i][j] = min3(
				matrix[i-1][j]+1,
				matrix[i][j-1]+1,
				matrix[i-1][j-1]+cost,
			)
		}
	}
	return matrix[rows-1][cols-1]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

func encontraMelhorCorrespondencia(lista []models.Logradouro, termo string, limiteSimilaridade int) (int, bool) {
	termoNormalizado := strings.ToLower(strings.TrimSpace(termo))
	if termoNormalizado == "" {
		return -1, false
	}

	if limiteSimilaridade <= 0 {
		limiteSimilaridade = len(termo)
		if limiteSimilaridade > 10 {
			limiteSimilaridade = 10
		}
	}

	melhorIndice := -1
	melhorPontuacao := -1

	for i, item := range lista {
		logradouroNormalizado := strings.ToLower(strings.TrimSpace(item.Logradouro))
		distancia := levenshteinDistance(termoNormalizado, logradouroNormalizado)
		pontuacao := distancia

		if strings.Contains(logradouroNormalizado, termoNormalizado) {
			pontuacao = pontuacao / 2
		}

		termoPalavras := strings.Fields(termoNormalizado)
		palavrasEncontradas := 0
		for _, palavra := range termoPalavras {
			if strings.Contains(logradouroNormalizado, palavra) {
				palavrasEncontradas++
			}
		}

		if palavrasEncontradas == len(termoPalavras) && len(termoPalavras) > 0 {
			pontuacao = pontuacao / 3
		} else if palavrasEncontradas > 0 {
			pontuacao = pontuacao * (len(termoPalavras) - palavrasEncontradas + 1) / len(termoPalavras)
		}

		if melhorPontuacao == -1 || pontuacao < melhorPontuacao {
			melhorPontuacao = pontuacao
			melhorIndice = i
		}
	}

	if melhorPontuacao <= limiteSimilaridade || melhorPontuacao < 5 {
		return melhorIndice, true
	}
	return -1, false
}

func (uc EnderecoUseCases) GetRegiao(input string) string {
	logradouro, bairro := parseEndereco(input)

	// 1) match direto no banco (com bairro quando disponível)
	if regiao, err := uc.repository.GetRegiaoByLogradouro(logradouro, bairro); err == nil {
		return regiao
	}
	
	// 2) candidatos por palavras-chave (query indexável, poucos registros)
	palavras := palavrasSignificativas(logradouro)
	if len(palavras) == 0 {
		return "Centro"
	}

	limiteSimilaridade := len(logradouro)
	if limiteSimilaridade > 10 {
		limiteSimilaridade = 10
	}

	for qtdPalavras := len(palavras); qtdPalavras >= 1; qtdPalavras-- {
		candidatos, err := uc.repository.FindCandidatosPorPalavras(palavras[:qtdPalavras], bairro, 25)
		if err != nil || len(candidatos) == 0 {
			continue
		}
		if idx, encontrado := encontraMelhorCorrespondencia(candidatos, logradouro, limiteSimilaridade); encontrado {
			return candidatos[idx].Regiao
		}
	}

	return "Centro"
}

func (uc EnderecoUseCases) GetRegiaoPorBairro(bairro string) string {
	bairro = strings.ToLower(strings.TrimSpace(bairro))
	if bairro == "" {
		return "Centro"
	}
	regiao, err := uc.repository.GetRegiaoByBairro(bairro)
	if err == nil {
		return regiao
	}
	return "Centro"
}

func (uc EnderecoUseCases) CadastrarEnderecos(enderecos []models.Endereco) error {
	for _, endereco := range enderecos {
		if err := uc.repository.CreateEndereco(endereco); err != nil {
			return err
		}
	}
	return nil
}
