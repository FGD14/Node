const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { FichaAluno, Inscricao, Curso, Nota, Pauta } = require('../models');
const { requireLogin, requireRole } = require('../middleware/auth');

router.use(requireLogin, requireRole('aluno'));

// ── Multer config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/uploads/fotos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, req.user.login + '_' + Date.now() + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Apenas JPG e PNG são aceites.'));
    }
});

// ── FICHA DE ALUNO ────────────────────────────────────────────────────
router.get('/ficha', async (req, res) => {
    const ficha = await FichaAluno.findOne({ user_login: req.user.login }).populate('curso_pretendido', 'nome');
    const cursos = await Curso.find({ ativo: true }).sort('nome');
    const msg = req.query.msg || '';
    res.render('aluno/ficha', { user: req.user, ficha, cursos, msg, erro: null });
});

router.post('/ficha', upload.single('foto'), async (req, res) => {
    const { nome_completo, data_nascimento, nacionalidade, nif, telefone, email, morada, curso_pretendido, acao } = req.body;
    const estado = acao === 'submeter' ? 'submetida' : 'rascunho';
    const login = req.user.login;

    try {
        let ficha = await FichaAluno.findOne({ user_login: login });

        if (ficha && ['submetida', 'aprovada'].includes(ficha.estado)) {
            return res.redirect('/aluno/ficha');
        }

        const foto = req.file ? '/uploads/fotos/' + req.file.filename : (ficha?.foto || '');

        const dados = { user_login: login, nome_completo, data_nascimento, nacionalidade, nif, telefone, email, morada, curso_pretendido, foto, estado };

        if (ficha) {
            await FichaAluno.findOneAndUpdate({ user_login: login }, dados);
        } else {
            await FichaAluno.create(dados);
        }

        res.redirect('/aluno/ficha?msg=' + (acao === 'submeter' ? 'submetida' : 'guardado'));
    } catch (err) {
        const cursos = await Curso.find({ ativo: true }).sort('nome');
        const ficha = await FichaAluno.findOne({ user_login: login });
        res.render('aluno/ficha', { user: req.user, ficha, cursos, msg: '', erro: err.message });
    }
});

// ── INSCRIÇÕES ────────────────────────────────────────────────────────
router.get('/inscricoes', async (req, res) => {
    const login = req.user.login;
    const ficha = await FichaAluno.findOne({ user_login: login });
    const ficha_aprovada = ficha?.estado === 'aprovada';

    const inscritos_q = await Inscricao.find({ user_login: login }).populate('curso_id', 'nome').sort('-data_pedido');
    const inscritos_ids = inscritos_q.map(i => i.curso_id?._id?.toString());

    const todos = await Curso.find({ ativo: true }).sort('nome');
    const disponiveis = todos.filter(c => !inscritos_ids.includes(c._id.toString()));

    const msg = req.query.msg || '';
    res.render('aluno/inscricoes', { user: req.user, inscritos: inscritos_q, disponiveis, ficha_aprovada, msg });
});

router.post('/inscricoes/inscrever', async (req, res) => {
    const login = req.user.login;
    const ficha = await FichaAluno.findOne({ user_login: login });

    if (!ficha || ficha.estado !== 'aprovada') {
        return res.redirect('/aluno/inscricoes?msg=sem_ficha');
    }

    try {
        await Inscricao.create({ user_login: login, curso_id: req.body.curso_id });
        res.redirect('/aluno/inscricoes?msg=inscrito');
    } catch {
        res.redirect('/aluno/inscricoes?msg=erro');
    }
});

router.post('/inscricoes/cancelar', async (req, res) => {
    await Inscricao.findOneAndDelete({ user_login: req.user.login, curso_id: req.body.curso_id });
    res.redirect('/aluno/inscricoes?msg=cancelado');
});

// ── NOTAS ─────────────────────────────────────────────────────────────
router.get('/notas', async (req, res) => {
    const login = req.user.login;
    const notas = await Nota.find({ user_login: login }).populate({ path: 'pauta_id', populate: { path: 'disciplina_id', select: 'nome' } });
    res.render('aluno/notas', { user: req.user, notas });
});

module.exports = router;
