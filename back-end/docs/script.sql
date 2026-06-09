-- Ouvidoria Clara Jussara
-- Banco: ouvidoria_clara_jussara (mesmo valor de DB_NAME no .env)
--
-- Criar o banco (rodar conectado em postgres):
--   psql -U evolution -d postgres -f script.sql
-- Ou só o schema (banco já existe):
--   psql -U evolution -d ouvidoria_clara_jussara -f script.sql
--   (pule o bloco CREATE DATABASE abaixo)

SELECT 'CREATE DATABASE ouvidoria_clara_jussara OWNER evolution'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ouvidoria_clara_jussara')\gexec

\connect ouvidoria_clara_jussara

DROP TABLE IF EXISTS protocolo CASCADE;
DROP TABLE IF EXISTS reclamacao CASCADE;
DROP TABLE IF EXISTS mensagens CASCADE;
DROP TABLE IF EXISTS conversas CASCADE;
DROP TABLE IF EXISTS contatos CASCADE;
DROP TABLE IF EXISTS enderecos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS cliente CASCADE;
DROP TABLE IF EXISTS atividade_clientes CASCADE;

CREATE TABLE contatos (
    telefone TEXT PRIMARY KEY,
    nome TEXT,
    conversation_id TEXT,
    ativo BOOLEAN DEFAULT true,
    instance TEXT DEFAULT '' NOT NULL,
    data_criacao DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE cliente (
    telefone TEXT PRIMARY KEY,
    nome TEXT,
    cidade TEXT,
    endereco TEXT,
    bairro TEXT,
    data_nascimento TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE conversas (
    telefone TEXT NOT NULL,
    data TEXT NOT NULL
);

CREATE TABLE atividade_clientes (
    telefone TEXT NOT NULL,
    ultima_interacao TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lembrete_10min BOOLEAN NOT NULL DEFAULT FALSE,
    lembrete_1day BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT atividade_clientes_pkey
        PRIMARY KEY (telefone),

    CONSTRAINT atividade_clientes_telefone_fkey
        FOREIGN KEY (telefone)
        REFERENCES contatos (telefone)
        ON DELETE CASCADE
);


CREATE TABLE mensagens (
    id SERIAL PRIMARY KEY,
    telefone TEXT NOT NULL,
    conteudo TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foienviado BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE enderecos (
    logradouro TEXT NOT NULL,
    bairro TEXT DEFAULT '' NOT NULL,
    regiao TEXT DEFAULT '' NOT NULL
);

CREATE TABLE reclamacao (
    idreclamacao SERIAL PRIMARY KEY,
    telefone TEXT NOT NULL,
    categoria TEXT DEFAULT '' NOT NULL,
    reclamacao TEXT DEFAULT '' NOT NULL,
    tipo TEXT DEFAULT '' NOT NULL,
    status TEXT DEFAULT 'Em análise' NOT NULL,
    detalhes JSONB DEFAULT '{}' NOT NULL,
    data_criacao TIMESTAMP DEFAULT now() NOT NULL,
    data_atualizacao TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE protocolo (
    idprotocolo SERIAL PRIMARY KEY,
    idreclamacao INTEGER NOT NULL,
    numero TEXT DEFAULT '' NOT NULL,
    avisado BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT fk_protocolo FOREIGN KEY (idreclamacao) REFERENCES reclamacao (idreclamacao) ON DELETE CASCADE
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    unidade TEXT DEFAULT '' NOT NULL,
    celular TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    endereco TEXT DEFAULT '' NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    role TEXT DEFAULT 'user' NOT NULL
);


CREATE INDEX idx_reclamacao_telefone ON reclamacao (telefone);
CREATE INDEX idx_reclamacao_status ON reclamacao (status);
CREATE INDEX idx_reclamacao_tipo ON reclamacao (tipo);
CREATE INDEX idx_reclamacao_regiao ON reclamacao (regiao);
CREATE INDEX idx_enderecos_logradouro ON enderecos (logradouro);
CREATE INDEX idx_mensagens_telefone ON mensagens (telefone);
CREATE INDEX idx_conversas_telefone_data ON conversas (telefone, data);

INSERT INTO Enderecos (logradouro, bairro, regiao) VALUES ()