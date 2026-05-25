const express = require('express');
const router = express.Router();
const { Venda, Produto, Caixa, PedidoFornecimento, Producao } = require('../models');
const { Op } = require('sequelize');

// Middleware para verificar autenticação
const authRequired = (req, res, next) => {
  if (!req.session.user) {
    console.log({message:'Não tens permissão para acessar a pagina de deashboard'})
    return res.redirect('/auth/login');
  }
  next();
};

// Página inicial (login redireciona para dashboard)
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    //res.redirect('/dashboard');
    res.redirect('/auth/login');
  }
});

// Dashboard
router.get('/dashboard', authRequired, async (req, res) => {
  // Dados de utilizador
  
  try {
    // Estatísticas para o dashboard
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    // Vendas de hoje
    const vendasHoje = await Venda.findAll({
      where: {
        data_venda: {
          [Op.gte]: hoje,
          [Op.lt]: amanha
        },
        status: 'concluida'
      }
    });
    
    const totalVendasHoje = vendasHoje.reduce((total, venda) => total + parseFloat(venda.valor_total), 0);
    
    /*/ Produtos com estoque baixo
    const produtosEstoqueBaixo = await Produto.findAll({
      where: {
        quantidade_estoque: {
          [Op.lte]: sequelize.col('quantidade_minima')
        },
        ativo: true
      },
      limit: 5
    });
    */
    // Caixa aberto
    const caixaAberto = await Caixa.findOne({
      where: { 
        status: 'aberto',
        funcionario_id: req.session.user.id
      }
    });
    
    // Pedidos pendentes
    const pedidosPendentes = await PedidoFornecimento.count({
      where: { status: 'pendente' }
    });
    
    // Produção em andamento
    const producaoAndamento = await Producao.count({
      where: { 
        status: {
          [Op.in]: ['pendente', 'em_producao']
        }
      }
    });

    res.render('dashboard', {
      title: 'Dashboard',
      totalVendasHoje,
      caixaAberto,
      pedidosPendentes,
      producaoAndamento,
      vendasHoje: vendasHoje.length,
      Utilizador:req.session.user
    });
    
  } catch (error) {
    
    console.log('erro: ',error)
    console.log('Nomeeeeeeeee: ',nome)
    req.session.error_msg = 'Erro ao carregar dashboard';
    res.render('dashboard', {
      title: 'Dashboard',
      totalVendasHoje: 0,
      produtosEstoqueBaixo: [],
      caixaAberto: null,
      pedidosPendentes: 0,
      producaoAndamento: 10,
      vendasHoje: 0,
      Utilizador:req.session.user
    });

  }
});

module.exports = router;