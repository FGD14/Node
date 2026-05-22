const express = require('express');
const router  = express.Router();
const { Inscricao, Pauta, Nota, Disciplina, Utilizador } = require('../models');
const { requireLogin, requireRole } = require('../middleware/auth');

router.use(requireLogin, requireRole('funcionario'));

// ── PEDIDOS DE MATRÍCULA ──────────────────────────────────────────────
router.get('/inscricoes', async (req, res) => {
    const filtro = req.query.filtro || 'pendente';
    const inscricoes = await Inscricao.find({ estado: filtro }).populate('curso_id', 'nome').sort('-data_pedido');
    const msg = req.query.msg || '';
    res.render('funcionario/inscricoes', { user: req.user, inscricoes, filtro, msg });
});

router.post('/inscricoes/:id/decidir', async (req, res) => {
    const { acao, observacoes } = req.body;
    const estado = acao === 'aprovar' ? 'aprovado' : 'rejeitado';
    await Inscricao.findByIdAndUpdate(req.params.id, {
        estado,
        observacoes,
        decidido_por: req.user.login,
        data_decisao: new Date(),
    });
    res.redirect('/funcionario/inscricoes?msg=' + estado);
});

// ── PAUTAS ────────────────────────────────────────────────────────────
router.get('/pautas', async (req, res) => {
    const pautas = await Pauta.find().populate('disciplina_id', 'nome').sort('-data_criacao');
    const msg = req.query.msg || '';
    res.render('funcionario/pautas', { user: req.user, pautas, msg });
});

router.post('/pautas/nova', async (req, res) => {
    try {
        const { disciplina_id, ano_letivo, epoca } = req.body;
        await Pauta.create({ disciplina_id, ano_letivo, epoca, criado_por: req.user.login });
        res.redirect('/funcionario/pautas?msg=criada');
    } catch (err) {
        res.redirect('/funcionario/pautas?msg=duplicada');
    }
});

router.get('/pautas/:id', async (req, res) => {
    const pauta = await Pauta.findById(req.params.id).populate('disciplina_id', 'nome');
    if (!pauta) return res.redirect('/funcionario/pautas');

    const notas = await Nota.find({ pauta_id: req.params.id }).sort('user_login');
    const disciplinas = await Disciplina.find().sort('nome');
    const msg = req.query.msg || '';
    res.render('funcionario/pauta_notas', { user: req.user, pauta, notas, disciplinas, msg });
});

router.post('/pautas/:id/notas', async (req, res) => {
    const { notas } = req.body;
    if (notas) {
        for (const [user_login, nota] of Object.entries(notas)) {
            const nota_val = nota === '' ? null : parseFloat(nota);
            await Nota.findOneAndUpdate(
                { pauta_id: req.params.id, user_login },
                { nota: nota_val, registado_por: req.user.login, data_registo: new Date() },
                { upsert: true }
            );
        }
    }
    res.redirect('/funcionario/pautas/' + req.params.id + '?msg=guardado');
});

router.post('/pautas/:id/adicionar-aluno', async (req, res) => {
    const { al_login } = req.body;
    const user = await Utilizador.findOne({ login: al_login });
    if (user) {
        await Nota.findOneAndUpdate(
            { pauta_id: req.params.id, user_login: al_login },
            { registado_por: req.user.login, data_registo: new Date() },
            { upsert: true }
        );
    }
    res.redirect('/funcionario/pautas/' + req.params.id + '?msg=' + (user ? 'aluno_adicionado' : 'aluno_nao_encontrado'));
});

module.exports = router;
