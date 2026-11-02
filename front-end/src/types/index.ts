export interface LoginSession {
  id: number
  expiration_time: number
  root: boolean
  message?: string
  celular?: string
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
  campanha?: string | null
}

export interface Contact {
  conversation_id: string | null
  nome: string
  telefone: string
  instance: string | null
  ativo: boolean
  data_criacao: string
}

export interface Campanha {
  id: number
  palavraChave: string
  qtdContatos?: number
}

export interface ContatoCampanha {
  telefone: string
  nome: string
}

export interface ImportLinhaErro {
  linha: number
  telefone: string
  motivo: string
}

export interface ImportContatosResult {
  criados: number
  invalidos: ImportLinhaErro[]
  duplicados: ImportLinhaErro[]
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
  campanha?: string | null
  leadAtivo: boolean
  darwinAtivo: boolean
  isGelado: boolean
  isCliente: boolean
  hasReclamacao: boolean
  dataCriacao?: string
}

export interface OcorrenciaPorCidade {
  cidade: string
  categoria: Record<string, number>
  total: number
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
  id?: number
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
  mensagem?: string
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
  idUsuario?: number | null
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
  idUsuario?: number
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

// ---- Conversas (chat nativo historico_chat) ----

export interface MensagemChat {
  id: number
  remetente: 'cliente' | 'ia' | 'agente'
  conteudo: string
  tipo: string // 'texto' | 'imagem' | 'audio'
  linkMidia: string
  criadoEm: string
}

// Janela de 24h da Meta: aberta = texto livre; fechada = só mensagem modelo
export interface JanelaAtendimento {
  aberta: boolean
  segundosRestantes: number
}

export interface HistoricoChatResponse {
  telefone: string
  nome: string
  mensagens: MensagemChat[]
  janela?: JanelaAtendimento
}

export interface ConversaResumo {
  telefone: string
  nome: string
  ultimaMensagem: string
  remetenteUltima: string
  tipoUltima: string
  criadoEm: string
}
