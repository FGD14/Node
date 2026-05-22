const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'ipca_secret_2026';

function createToken(user) {
    return jwt.sign(
        { id: user._id, login: user.login, perfil: user.perfil },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

function requireLogin(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        console.log('requireLogin: no token found. cookies:', req.cookies);
        return res.redirect('/');
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        console.log('requireLogin: invalid token:', err.message);
        res.clearCookie('token');
        return res.redirect('/');
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || req.user.perfil !== role) return res.redirect('/dashboard');
        next();
    };
}

module.exports = { createToken, requireLogin, requireRole };
