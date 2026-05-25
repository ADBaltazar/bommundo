const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const produtoRoutes = require('./routes/produtos');
const vendaRoutes = require('./routes/vendas');
const caixaRoutes = require('./routes/caixa');
const pedidoRoutes = require('./routes/pedidos');
const producaoRoutes = require('./routes/producao');

const app = express();

// Configuração da view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'sistema-gestao-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Middleware para variáveis globais
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.session.success_msg || null;
  res.locals.error_msg = req.session.error_msg || null;
  res.locals.currentPath = req.path;
  
  // Limpar mensagens flash após exibição
  req.session.success_msg = null;
  req.session.error_msg = null;
  
  next();
});

// Rotas
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/produtos', produtoRoutes);
app.use('/vendas', vendaRoutes);
app.use('/caixa', caixaRoutes);
//app.use('/pedidos', pedidoRoutes);
//app.use('/producao', producaoRoutes);

// Rota para página não encontrada
app.use((req, res) => {
  console.log({message:'pagina não encontrada'})
  res.status(404).render('404', { title: 'Página não encontrada' });
});

// Sincronizar com o banco de dados e iniciar servidor
const PORT = process.env.PORT || 3000;

sequelize.sync({ force: false })
  .then(() => {
    console.log('Banco de dados sincronizado');
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erro ao sincronizar banco de dados:', err);
  });
 
module.exports = app;