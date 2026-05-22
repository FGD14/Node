require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');
const connectDB    = require('./config/database');

const authRoutes        = require('./routes/auth');
const gestorRoutes      = require('./routes/gestor');
const funcionarioRoutes = require('./routes/funcionario');
const alunoRoutes       = require('./routes/aluno');

const app = express();

// ── View engine ──────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/',            authRoutes);
app.use('/gestor',      gestorRoutes);
app.use('/funcionario', funcionarioRoutes);
app.use('/aluno',       alunoRoutes);

// ── Debug (remover em produção) ───────────────────────────────────────
app.get('/debug-cookies', (req, res) => {
    res.json({ cookies: req.cookies, headers: req.headers.cookie });
});

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).redirect('/'));

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
});
