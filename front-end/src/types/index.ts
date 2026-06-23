export interface LoginSession {
  id: number
  expiration_time: number
  root: boolean
  message?: string
}

export interface Usuario {
  celular: string
  senha: string
}

export interface Cliente {
  telefone: string
  nome: string
  cidade: string
  endereco: string
  bairro: string
  dataNascimento: string
  dataCriacao: string
}

export interface Contato {
  telefone: string
  nome: string
  conversationId: string | null
  ativo: boolean
  instance: string | null
  data_criacao: string
}

export interface Contact {
  conversation_id: string | null
  nome: string
  telefone: string
  instance: string | null
  ativo: boolean
  data_criacao: string
}

export interface Lead {
  nome: string
  telefone: string
  ativo: boolean
}

export interface LeadsResponse {
  leads: Lead[]
  ocupacao: string
  limite: number
  usados: number
  total: number
}

export interface ContatoUnificado {
  telefone: string
  nome: string
  cidade?: string
  endereco?: string
  bairro?: string
  dataNascimento?: string
  conversationId?: string | null
  instance?: string | null
  leadAtivo: boolean
  darwinAtivo: boolean
  isGelado: boolean
  isCliente: boolean
  hasReclamacao: boolean
  dataCriacao?: string
}

export interface Protocolo {
  idProtocolo: number
  idReclamacao: number
  numero: number
  avisado: boolean
}

export interface Endereco {
  Logradouro: string
  Bairro: string
  Região: number
}

export interface Logradouro {
  logradouro: string
  bairro: string
  regiao: string
}

export interface Mensagem {
  id: number
  telefone: string
  conteudo: string
  foiEnviado: boolean
  createdAt: string
  updatedAt: string
}

export interface GetMensagensResponse {
  telefone: string
  data: string
  horario: string
  diaSemana: string
  mensagem: string
}

export interface Ocorrencia {
  id: number
  telefone: string
  categoria: string
  situacaoResumida: string
  tipo: string
  status: string
  detalhes: DetalhesReclamacao
  ehManual: boolean
  mensagemFinal?: string
  observacao?: string
  dataCriacao: string
  dataAtualizacao: string
  nomeCliente?: string
  enderecoCliente?: string
  bairroCliente?: string
  cidadeCliente?: string
  dataNascimentoCliente?: string
}

export interface OcorrenciaRequest {
  telefone: string
  nomeCliente: string
  enderecoCliente: string
  bairroCliente: string
  cidadeCliente: string
  dataNascimentoCliente: string
  situacaoResumida: string
  categoria: string
  ehManual: boolean
  observacao?: string
  enderecoOcorrencia?: string
  conheceTutor?: string
  condicoesAnimal?: string
  frequenciaMausTratos?: string
  nomeAnimal?: string
  especieAnimal?: string
  idadeAnimal?: string
  sexoAnimal?: string
  bairroAnimal?: string
  nomeResponsavelAnimal?: string
  telefoneResponsavelAnimal?: string
  historicoAnimal?: string
  temCadUnico?: string
  ehProtetorIndependente?: string
  situacaoAnimal?: string
  quandoCruzou?: string
  infoSaudeAnimal?: string
  detalhesDenuncia?: string
  tempoAnimalLocal?: string
  ferimentosAnimal?: string
  providenciasAnimal?: string
  midiasAnimal?: string
  protocoloDenuncia?: string
  regiao?: string
}

export interface OcorrenciaUpdateRequest {
  situacaoResumida: string
  categoria: string
  status: string
  mensagemFinal?: string
  observacao?: string
  enderecoOcorrencia?: string
  conheceTutor?: string
  condicoesAnimal?: string
  frequenciaMausTratos?: string
  nomeAnimal?: string
  especieAnimal?: string
  idadeAnimal?: string
  sexoAnimal?: string
  bairroAnimal?: string
  nomeResponsavelAnimal?: string
  telefoneResponsavelAnimal?: string
  historicoAnimal?: string
  temCadUnico?: string
  ehProtetorIndependente?: string
  situacaoAnimal?: string
  quandoCruzou?: string
  infoSaudeAnimal?: string
  detalhesDenuncia?: string
  tempoAnimalLocal?: string
  ferimentosAnimal?: string
  providenciasAnimal?: string
  midiasAnimal?: string
  protocoloDenuncia?: string
  regiao?: string
}

export interface DetalhesReclamacao {
  enderecoOcorrencia?: string
  conheceTutor?: string
  condicoesAnimal?: string
  frequenciaMausTratos?: string
  nomeAnimal?: string
  especieAnimal?: string
  idadeAnimal?: string
  sexoAnimal?: string
  bairroAnimal?: string
  nomeResponsavelAnimal?: string
  telefoneResponsavelAnimal?: string
  historicoAnimal?: string
  temCadUnico?: string
  ehProtetorIndependente?: string
  situacaoAnimal?: string
  quandoCruzou?: string
  infoSaudeAnimal?: string
  detalhesDenuncia?: string
  tempoAnimalLocal?: string
  ferimentosAnimal?: string
  providenciasAnimal?: string
  midiasAnimal?: string
  protocoloDenuncia?: string
  regiao?: string
}


export interface StatsRegiao {
  regiao: string
  qtdRegiao: number
}

export interface StatsCategoria {
  categoria: string
  qtdCategoria: number
}

export interface StatsTipo {
  tipo: string
  qtdTipo: number
}

export interface Stat {
  numPessoas: number
  numReclamacoes: number
  percIndicacao: number
  percRequerimento: number
  regioes: StatsRegiao[]
  categorias: StatsCategoria[]
  tipos: StatsTipo[]
  indicacoesAprovadas: number
  totalIndicacoes: number
  requerimentosAprovados: number
  totalRequerimentos: number
}
