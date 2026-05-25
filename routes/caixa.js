const express = require('express');
const router = express.Router();
const { Caixa, MovimentoCaixa, Funcionario, Venda } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Middleware de autenticação
const authRequired = (req, res, next) => {
  if (!req.session.user) {
    req.session.error_msg = 'Você precisa fazer login para acessar esta página';
    return res.redirect('/auth/login');
  }
  next();
};

// Listar caixas
router.get('/', authRequired, async (req, res) => {
  console.log({message:'estou na rota principal do caixa'})
  try {
    const { status } = req.query;
    let whereClause = {};
    
    if (status && status !== 'todos') {
      whereClause.status = status;
    }
    
    const caixas = await Caixa.findAll({
      where: whereClause,
      include: [
        { model: Funcionario, attributes: ['nome'] }
      ],
      order: [['data_abertura', 'DESC']]
    });
    
    res.render('caixa/listar', {
      title: 'Controle de Caixa',
      caixas,
      statusFiltro: status || 'todos'
    });
  } catch (error) {
    console.error('Erro ao buscar caixas:', error);
    req.session.error_msg = 'Erro ao carregar caixas';
    res.redirect('/');
  }
});

// Abrir caixa - formulário
router.get('/abrir', authRequired, async (req, res) => {
  console.log({message:'estou na rota principal para abrir o caixa'})

  try {
    // Verificar se já existe caixa aberto para este funcionário
    const caixaAberto = await Caixa.findOne({
      where: { 
        status: 'aberto', 
        funcionario_id:1 // req.session.user.funcionarioId 
      }
    });
    
    if (caixaAberto) {
      req.session.error_msg = 'Você já tem um caixa aberto. Feche-o antes de abrir outro.';
      console.log({message:'TEM ALGUM CAIXA ABERTO'})

      return res.redirect('/caixa');
    }
    console.log({message:'tudo correu bem **** '})
    res.render('caixa/abrir', {
      title: 'Abrir Caixa'
    });
  } catch (error) {
    console.error('Erro ao carregar formulário de abertura:', error);
    req.session.error_msg = 'Erro ao carregar formulário';
    console.log('alguma coisa deu errado ******',error)
    res.redirect('/caixa');
  }
});

// Processar abertura de caixa
router.post('/abrir', authRequired, async (req, res) => {
  try {
    const { valor_abertura } = req.body;
    
    // Verificar se já existe caixa aberto para este funcionário
    const caixaAberto = await Caixa.findOne({
      where: { 
        status: 'aberto', 
        funcionario_id: 1 //req.session.user.funcionarioId 
      }
    });
    
    if (caixaAberto) {
      req.session.error_msg = 'Você já tem um caixa aberto. Feche-o antes de abrir outro.';
      return res.redirect('/caixa');
    }
    
    // Criar novo caixa
    const caixa = await Caixa.create({
      funcionario_id: 1, //req.session.user.funcionarioId,
      valor_abertura: parseFloat(valor_abertura) || 0,
      status: 'aberto'
    });
    
    // Registrar movimento de abertura
    await MovimentoCaixa.create({
      caixa_id: caixa.id,
      descricao: 'Abertura de caixa',
      valor: parseFloat(valor_abertura) || 0,
      tipo: 'entrada',
      categoria: 'outros'
    });
    
    req.session.success_msg = `Caixa #${caixa.id} aberto com sucesso!`;
    res.redirect('/caixa');
  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    req.session.error_msg = 'Erro ao abrir caixa';
    res.redirect('/caixa/abrir');
  }
});

// Detalhes do caixa
router.get('/:id', authRequired, async (req, res) => {
  try {
    const caixa = await Caixa.findByPk(req.params.id, {
      include: [
        { model: Funcionario, attributes: ['nome'] },
        { 
          model: MovimentoCaixa,
          order: [['data_movimento', 'ASC']]
        },
        {
          model: Venda,
          include: [{ model: Funcionario, attributes: ['nome'] }]
        }
      ]
    });
    
    if (!caixa) {
      req.session.error_msg = 'Caixa não encontrado';
      return res.redirect('/caixa');
    }
    
    // Calcular totais
    const totalEntradas = caixa.MovimentoCaixas
      .filter(m => m.tipo === 'entrada')
      .reduce((total, m) => total + parseFloat(m.valor), 0);
    
    const totalSaidas = caixa.MovimentoCaixas
      .filter(m => m.tipo === 'saida')
      .reduce((total, m) => total + parseFloat(m.valor), 0);
    
    const saldoAtual = parseFloat(caixa.valor_abertura) + totalEntradas - totalSaidas;
    
    res.render('caixa/detalhes', {
      title: `Caixa #${caixa.id}`,
      caixa,
      totalEntradas,
      totalSaidas,
      saldoAtual
    });
  } catch (error) {
    console.error('Erro ao carregar caixa:', error);
    req.session.error_msg = 'Erro ao carregar caixa';
    res.redirect('/caixa');
  }
});

// Fechar caixa
router.post('/fechar/:id', authRequired, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const caixa = await Caixa.findByPk(req.params.id, {
      include: [{ model: MovimentoCaixa }],
      transaction
    });
    
    if (!caixa || caixa.status === 'fechado') {
      throw new Error('Caixa não encontrado ou já fechado');
    }
    
    if (caixa.funcionario_id !== req.session.user.id) {
      throw new Error('Você só pode fechar seu próprio caixa');
    }
    
    // Calcular totais
    const totalEntradas = caixa.MovimentoCaixas
      .filter(m => m.tipo === 'entrada')
      .reduce((total, m) => total + parseFloat(m.valor), 0);
    
    const totalSaidas = caixa.MovimentoCaixas
      .filter(m => m.tipo === 'saida')
      .reduce((total, m) => total + parseFloat(m.valor), 0);
    
    const saldoFinal = parseFloat(caixa.valor_abertura) + totalEntradas - totalSaidas - parseFloat(caixa.valor_abertura);
    
    // Atualizar caixa
    await caixa.update({
      data_fechamento: new Date(),
      valor_fechamento: saldoFinal,
      valor_total_vendas: totalEntradas, // Considerando que vendas são entradas
      valor_total_despesas: totalSaidas,
      saldo_final: saldoFinal,
      status: 'fechado'
    }, { transaction });
    
    await transaction.commit();
    
    req.session.success_msg = `Caixa #${caixa.id} fechado com sucesso! Saldo final: R$ ${saldoFinal.toFixed(2)}`;
    res.redirect('/caixa');
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao fechar caixa:', error);
    req.session.error_msg = error.message || 'Erro ao fechar caixa';
    res.redirect('/caixa');
  }
});

// Adicionar movimento ao caixa
router.post('/:id/movimento', authRequired, async (req, res) => {
  try {
    const { descricao, valor, tipo, categoria } = req.body;
    const caixaId = req.params.id;
    
    const caixa = await Caixa.findByPk(caixaId);
    
    if (!caixa || caixa.status === 'fechado') {
      req.session.error_msg = 'Caixa não encontrado ou já fechado';
      return res.redirect('/caixa');
    }
    
    if (caixa.funcionario_id !== req.session.user.funcionarioId) {
      req.session.error_msg = 'Você só pode adicionar movimentos ao seu próprio caixa';
      return res.redirect('/caixa');
    }
    
    await MovimentoCaixa.create({
      caixa_id: caixaId,
      descricao,
      valor: parseFloat(valor),
      tipo,
      categoria
    });
    
    req.session.success_msg = 'Movimento adicionado com sucesso!';
    res.redirect(`/caixa/${caixaId}`);
  } catch (error) {
    console.error('Erro ao adicionar movimento:', error);
    req.session.error_msg = 'Erro ao adicionar movimento';
    res.redirect(`/caixa/${req.params.id}`);
  }
});

module.exports = router;