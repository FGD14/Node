const mongoose = require('mongoose');

// ── Utilizador ────────────────────────────────────────────────────────
const utilizadorSchema = new mongoose.Schema({
    login:         { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    perfil:        { type: String, enum: ['gestor', 'funcionario', 'aluno'], required: true },
    ativo:         { type: Boolean, default: true },
}, { timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' } });

// ── Curso ─────────────────────────────────────────────────────────────
const cursoSchema = new mongoose.Schema({
    nome:  { type: String, required: true },
    ativo: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'criado_em' } });

// ── Disciplina (UC) ───────────────────────────────────────────────────
const disciplinaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
}, { timestamps: { createdAt: 'criado_em' } });

// ── Plano de Estudos ──────────────────────────────────────────────────
const planoSchema = new mongoose.Schema({
    curso_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
    disciplina_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Disciplina', required: true },
    ano:           { type: Number, default: 1 },
    semestre:      { type: Number, default: 1 },
});
planoSchema.index({ curso_id: 1, disciplina_id: 1 }, { unique: true });

// ── Ficha de Aluno ────────────────────────────────────────────────────
const fichaAlunoSchema = new mongoose.Schema({
    user_login:       { type: String, required: true, unique: true },
    nome_completo:    { type: String },
    data_nascimento:  { type: Date },
    nacionalidade:    { type: String, default: 'Portuguesa' },
    nif:              { type: String },
    telefone:         { type: String },
    email:            { type: String },
    morada:           { type: String },
    curso_pretendido: { type: mongoose.Schema.Types.ObjectId, ref: 'Curso' },
    foto:             { type: String, default: '' },
    estado:           { type: String, enum: ['rascunho', 'submetida', 'aprovada', 'rejeitada'], default: 'rascunho' },
    observacoes:      { type: String },
    validado_por:     { type: String },
    data_validacao:   { type: Date },
}, { timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' } });

// ── Inscrição ─────────────────────────────────────────────────────────
const inscricaoSchema = new mongoose.Schema({
    user_login:   { type: String, required: true },
    curso_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Curso', required: true },
    estado:       { type: String, enum: ['pendente', 'aprovado', 'rejeitado'], default: 'pendente' },
    observacoes:  { type: String },
    decidido_por: { type: String },
    data_decisao: { type: Date },
    data_pedido:  { type: Date, default: Date.now },
});
inscricaoSchema.index({ user_login: 1, curso_id: 1 }, { unique: true });

// ── Pauta ─────────────────────────────────────────────────────────────
const pautaSchema = new mongoose.Schema({
    disciplina_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Disciplina', required: true },
    ano_letivo:    { type: String, required: true },
    epoca:         { type: String, enum: ['Normal', 'Recurso', 'Especial'], default: 'Normal' },
    criado_por:    { type: String },
}, { timestamps: { createdAt: 'data_criacao' } });
pautaSchema.index({ disciplina_id: 1, ano_letivo: 1, epoca: 1 }, { unique: true });

// ── Nota ──────────────────────────────────────────────────────────────
const notaSchema = new mongoose.Schema({
    pauta_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Pauta', required: true },
    user_login:   { type: String, required: true },
    nota:         { type: Number, min: 0, max: 20, default: null },
    registado_por: { type: String },
    data_registo:  { type: Date, default: Date.now },
});
notaSchema.index({ pauta_id: 1, user_login: 1 }, { unique: true });

module.exports = {
    Utilizador: mongoose.model('Utilizador', utilizadorSchema),
    Curso:      mongoose.model('Curso',      cursoSchema),
    Disciplina: mongoose.model('Disciplina', disciplinaSchema),
    Plano:      mongoose.model('Plano',      planoSchema),
    FichaAluno: mongoose.model('FichaAluno', fichaAlunoSchema),
    Inscricao:  mongoose.model('Inscricao',  inscricaoSchema),
    Pauta:      mongoose.model('Pauta',      pautaSchema),
    Nota:       mongoose.model('Nota',       notaSchema),
};
