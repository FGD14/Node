require('dotenv').config();
const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const { Utilizador, Curso, Disciplina, Plano } = require('./models');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ipca_gestao');
    console.log('✅ Conectado ao MongoDB');

    // Limpar tudo
    await Utilizador.deleteMany();
    await Curso.deleteMany();
    await Disciplina.deleteMany();
    await Plano.deleteMany();

    // Utilizadores
    const hash = async (pwd) => bcrypt.hash(pwd, 10);
    await Utilizador.create([
        { login: 'gestor1',      password_hash: await hash('123456'), perfil: 'gestor' },
        { login: 'funcionario1', password_hash: await hash('123456'), perfil: 'funcionario' },
        { login: 'aluno',        password_hash: await hash('123456'), perfil: 'aluno' },
    ]);
    console.log('✅ Utilizadores criados');

    // Cursos
    const cursos = await Curso.create([
        { nome: 'Desenvolvimento Web e Multimédia' },
        { nome: 'Comércio Eletrónico' },
        { nome: 'Redes de Computadores' },
    ]);
    console.log('✅ Cursos criados');

    // Disciplinas
    const disciplinas = await Disciplina.create([
        { nome: 'Matemática' },
        { nome: 'Programação Web I' },
        { nome: 'Linguagens de Programação' },
        { nome: 'Português' },
    ]);
    console.log('✅ Disciplinas criadas');

    // Planos
    await Plano.create([
        { curso_id: cursos[0]._id, disciplina_id: disciplinas[0]._id, ano: 1, semestre: 1 },
        { curso_id: cursos[0]._id, disciplina_id: disciplinas[1]._id, ano: 1, semestre: 1 },
        { curso_id: cursos[1]._id, disciplina_id: disciplinas[3]._id, ano: 1, semestre: 1 },
    ]);
    console.log('✅ Planos criados');

    console.log('\n🎉 Seed completo!');
    console.log('Login: gestor1 / 123456');
    console.log('Login: funcionario1 / 123456');
    console.log('Login: aluno / 123456');
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
