const express = require('express');
const router  = express.Router();
const { Curso, Disciplina, Plano, Utilizador, FichaAluno, Inscricao } = require('../models');
const { requireLogin, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.use(requireLogin, requireRole('gestor'));

// ── CURSOS ────────────────────────────────────────────────────────────
router.get('/cursos', async (req, res) => {
    const q = req.query.q || '';
    const query = q ? { nome: { $regex: q, $options: 'i' } } : {};
    const cursos = await Curso.find(query).sort('nome');
    const msg = req.query.msg || '';
    res.render('gestor/cursos', { user: req.user, cursos, q, msg });
});

router.get('/cursos/novo', (req, res) => {
    res.render('gestor/curso_form', { user: req.user, curso: null, erro: null });
});

router.post('/cursos/novo', async (req, res) => {
    try {
        const { nome } = req.body;
        const existe = await Curso.findOne({ nome });
        if (existe) return res.render('gestor/curso_form', { user: req.user, curso: null, erro: 'Este curso já existe!' });
        await Curso.create({ nome });
        res.redirect('/gestor/cursos?msg=adicionado');
    } catch (err) {
        res.render('gestor/curso_form', { user: req.user, curso: null, erro: err.message });
    }
});

router.get('/cursos/editar/:id', async (req, res) => {
    const curso = await Curso.findById(req.params.id);
    if (!curso) return res.redirect('/gestor/cursos');
    res.render('gestor/curso_form', { user: req.user, curso, erro: null });
});

router.post('/cursos/editar/:id', async (req, res) => {
    await Curso.findByIdAndUpdate(req.params.id, { nome: req.body.nome });
    res.redirect('/gestor/cursos?msg=sucesso');
});

router.get('/cursos/desativar/:id', async (req, res) => {
    const curso = await Curso.findById(req.params.id);
    if (curso) await Curso.findByIdAndUpdate(req.params.id, { ativo: !curso.ativo });
    res.redirect('/gestor/cursos');
});

router.get('/cursos/apagar/:id', async (req, res) => {
    await Plano.deleteMany({ curso_id: req.params.id });
    await Inscricao.deleteMany({ curso_id: req.params.id });
    await Curso.findByIdAndDelete(req.params.id);
    res.redirect('/gestor/cursos');
});

// ── DISCIPLINAS ───────────────────────────────────────────────────────
router.get('/disciplinas', async (req, res) => {
    const q = req.query.q || '';
    const query = q ? { nome: { $regex: q, $options: 'i' } } : {};
    const disciplinas = await Disciplina.find(query).sort('nome');
    const msg = req.query.msg || '';
    res.render('gestor/disciplinas', { user: req.user, disciplinas, q, msg });
});

router.get('/disciplinas/nova', (req, res) => {
    res.render('gestor/disciplina_form', { user: req.user, disciplina: null, erro: null });
});

router.post('/disciplinas/nova', async (req, res) => {
    try {
        const { nome } = req.body;
        const existe = await Disciplina.findOne({ nome });
        if (existe) return res.render('gestor/disciplina_form', { user: req.user, disciplina: null, erro: 'Esta disciplina já existe!' });
        await Disciplina.create({ nome });
        res.redirect('/gestor/disciplinas?msg=adicionado');
    } catch (err) {
        res.render('gestor/disciplina_form', { user: req.user, disciplina: null, erro: err.message });
    }
});

router.get('/disciplinas/editar/:id', async (req, res) => {
    const disciplina = await Disciplina.findById(req.params.id);
    if (!disciplina) return res.redirect('/gestor/disciplinas');
    res.render('gestor/disciplina_form', { user: req.user, disciplina, erro: null });
});

router.post('/disciplinas/editar/:id', async (req, res) => {
    await Disciplina.findByIdAndUpdate(req.params.id, { nome: req.body.nome });
    res.redirect('/gestor/disciplinas?msg=sucesso');
});

router.get('/disciplinas/apagar/:id', async (req, res) => {
    await Plano.deleteMany({ disciplina_id: req.params.id });
    await Disciplina.findByIdAndDelete(req.params.id);
    res.redirect('/gestor/disciplinas');
});

// ── PLANOS DE ESTUDO ──────────────────────────────────────────────────
router.get('/planos', async (req, res) => {
    const planos = await Plano.find().populate('curso_id').populate('disciplina_id').sort('curso_id');
    const msg = req.query.msg || '';

    // Group by curso
    const grouped = {};
    planos.forEach(p => {
        const nome = p.curso_id?.nome || 'Sem curso';
        if (!grouped[nome]) grouped[nome] = [];
        grouped[nome].push(p);
    });

    res.render('gestor/planos', { user: req.user, grouped, msg });
});

router.get('/planos/novo', async (req, res) => {
    const cursos = await Curso.find({ ativo: true }).sort('nome');
    const disciplinas = await Disciplina.find().sort('nome');
    res.render('gestor/plano_form', { user: req.user, cursos, disciplinas, erro: null });
});

router.post('/planos/novo', async (req, res) => {
    try {
        const { curso_id, disciplina_id } = req.body;
        await Plano.create({ curso_id, disciplina_id });
        res.redirect('/gestor/planos?msg=adicionado');
    } catch (err) {
        const cursos = await Curso.find({ ativo: true }).sort('nome');
        const disciplinas = await Disciplina.find().sort('nome');
        res.render('gestor/plano_form', { user: req.user, cursos, disciplinas, erro: 'Esta disciplina já está associada a este curso!' });
    }
});

router.get('/planos/apagar/:curso/:disciplina', async (req, res) => {
    await Plano.findOneAndDelete({ curso_id: req.params.curso, disciplina_id: req.params.disciplina });
    res.redirect('/gestor/planos');
});

// ── VALIDAR FICHAS ────────────────────────────────────────────────────
router.get('/fichas', async (req, res) => {
    const filtro = req.query.filtro || 'submetida';
    const fichas = await FichaAluno.find({ estado: filtro }).populate('curso_pretendido', 'nome').sort('-atualizado_em');
    const msg = req.query.msg || '';
    res.render('gestor/fichas', { user: req.user, fichas, filtro, msg });
});

router.post('/fichas/:id/decidir', async (req, res) => {
    const { acao, observacoes } = req.body;
    const estado = acao === 'aprovar' ? 'aprovada' : 'rejeitada';
    await FichaAluno.findByIdAndUpdate(req.params.id, {
        estado,
        observacoes,
        validado_por: req.user.login,
        data_validacao: new Date(),
    });
    res.redirect('/gestor/fichas?msg=' + estado);
});

// ── UTILIZADORES ──────────────────────────────────────────────────────
router.get('/utilizadores', async (req, res) => {
    const utilizadores = await Utilizador.find().sort('login');
    const msg = req.query.msg || '';
    res.render('gestor/utilizadores', { user: req.user, utilizadores, msg, erro: null });
});

router.post('/utilizadores/novo', async (req, res) => {
    try {
        const { novo_login, novo_pwd, novo_perfil } = req.body;
        const existe = await Utilizador.findOne({ login: novo_login });
        if (existe) {
            const utilizadores = await Utilizador.find().sort('login');
            return res.render('gestor/utilizadores', { user: req.user, utilizadores, msg: '', erro: 'Este utilizador já existe!' });
        }
        const password_hash = await bcrypt.hash(novo_pwd, 10);
        await Utilizador.create({ login: novo_login, password_hash, perfil: novo_perfil });
        res.redirect('/gestor/utilizadores?msg=adicionado');
    } catch (err) {
        const utilizadores = await Utilizador.find().sort('login');
        res.render('gestor/utilizadores', { user: req.user, utilizadores, msg: '', erro: err.message });
    }
});

router.get('/utilizadores/apagar/:login', async (req, res) => {
    if (req.params.login === req.user.login) return res.redirect('/gestor/utilizadores');
    await Inscricao.deleteMany({ user_login: req.params.login });
    await Utilizador.findOneAndDelete({ login: req.params.login });
    res.redirect('/gestor/utilizadores?msg=apagado');
});

// ── INSCRIÇÕES (vista gestor) ─────────────────────────────────────────
router.get('/inscricoes', async (req, res) => {
    const inscricoes = await Inscricao.find().populate('curso_id', 'nome').sort('-data_pedido');
    res.render('gestor/inscricoes', { user: req.user, inscricoes });
});

module.exports = router;
