const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ipca_gestao');
        console.log('✅ MongoDB conectado');
    } catch (err) {
        console.error('❌ Erro MongoDB:', err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
