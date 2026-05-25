const express = require('express');
const router = express.Router();
const { Usuario } = require('../models');

// Página de login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
  //res.render('./login')
  //console.log({message:'Precisas acessar pelo login'})
});

// Processar login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  console.log('Email Recido: ',email)
  console.log('Senha Recebida: ',senha)
  try {
    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario /*|| !(usuario.senha == senha)*/) {
      req.session.error_msg = 'Email ou senha incorretos';
      console.log('Email não foi encontrado aaaaaa')
      return res.redirect('/auth/login');
    }
    
    if (!usuario.ativo) {
      req.session.error_msg = 'Usuário desativado';
      return res.redirect('/auth/login');
    }
    
    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo
    };
    
    req.session.success_msg = 'Login realizado com sucesso';
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erro no login:', error);
    console.log('Existe algum tipo de erro ******')

    req.session.error_msg = 'Erro ao realizar login';
    res.redirect('/auth/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;