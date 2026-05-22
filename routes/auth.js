const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const { Utilizador, Curso, Disciplina, Plano, Inscricao, FichaAluno, Pauta } = require('../models');
const { createToken, requireLogin } = require('../middleware/auth');

// ── GET / — Login page ────────────────────────────────────────────────
router.get('/', (req, res) => {
    const token = req.cookies?.token;
    if (token) return res.redirect('/dashboard');
    res.render('login', { erro: null, sucesso: null, mostrar_registo: false });
});

router.get('/login', (req, res) => {
    res.render('login', { erro: null, sucesso: null, mostrar_registo: false });
});

router.get('/registo', (req, res) => {
    res.render('login', { erro: null, sucesso: null, mostrar_registo: true });
});

// ── POST /login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { login, pwd } = req.body;
    console.log('Login attempt:', login);
    try {
        const user = await Utilizador.findOne({ login, ativo: { $ne: false } });
        console.log('User found:', user ? `${user.login} (${user.perfil})` : 'NOT FOUND');
        if (!user || !(await bcrypt.compare(pwd, user.password_hash))) {
            return res.render('login', { erro: 'Utilizador ou password incorretos.', sucesso: null, mostrar_registo: false });
        }
        const token = createToken(user);
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 8 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        console.log('Login OK, redirecting to /dashboard');
        res.redirect('/dashboard');
    } catch (err) {
        res.render('login', { erro: err.message, sucesso: null, mostrar_registo: false });
    }
});

// ── POST /registo — criar conta de aluno ─────────────────────────────
router.post('/registo', async (req, res) => {
    const { reg_login, reg_pwd } = req.body;
    try {
        if (!reg_login || !reg_pwd) {
            return res.render('login', { erro: null, sucesso: null, mostrar_registo: true, erro_registo: 'Preenche todos os campos!' });
        }
        const existe = await Utilizador.findOne({ login: reg_login });
        if (existe) {
            return res.render('login', { erro: null, sucesso: null, mostrar_registo: true, erro_registo: 'Este utilizador já existe!' });
        }
        const password_hash = await bcrypt.hash(reg_pwd, 10);
        await Utilizador.create({ login: reg_login, password_hash, perfil: 'aluno' });
        res.render('login', { erro: null, sucesso: 'Conta criada! Já podes fazer login.', mostrar_registo: false });
    } catch (err) {
        res.render('login', { erro: null, sucesso: null, mostrar_registo: true, erro_registo: err.message });
    }
});

// ── GET /logout ───────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// ── GET /dashboard ────────────────────────────────────────────────────
router.get('/dashboard', requireLogin, async (req, res) => {
    const { login, perfil } = req.user;
    try {
        const total_cursos      = await Curso.countDocuments();
        const total_disciplinas = await Disciplina.countDocuments();
        const total_planos      = await Plano.countDocuments();

        let extra = {};
        if (perfil === 'gestor') {
            extra.total_users      = await Utilizador.countDocuments();
            extra.total_inscricoes = await Inscricao.countDocuments();
        } else if (perfil === 'funcionario') {
            extra.pendentes = await Inscricao.countDocuments({ estado: 'pendente' });
            extra.total_pautas = await Pauta.countDocuments();
        } else {
            extra.minhas_inscricoes = await Inscricao.countDocuments({ user_login: login });
        }

        res.render('dashboard', { user: req.user, total_cursos, total_disciplinas, total_planos, ...extra });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Erro no dashboard: ' + err.message);
    }
});

module.exports = router;
