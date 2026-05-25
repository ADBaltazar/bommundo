const express = require('express');
const router = express.Router();
const { PedidoFornecimento, ItemPedido, Produto, Funcionario } = require('../models');
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

// Listar pedidos
router.get('/', authRequired, async (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = {};
    
    if (status && status !== 'todos') {
      whereClause.status = status;
    }
    
    const pedidos = await PedidoFornecimento.findAll({
      where: whereClause,
      include: [
        { model: Funcionario, attributes: ['nome'] }
      ],
      order: [['data_pedido', 'DESC']]
    });
    
    res.render('pedidos/listar', {
      title: 'Pedidos de Fornecimento',
      pedidos,
      statusFiltro: status || 'todos'
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    req.session.error_msg = 'Erro ao carregar pedidos';
    res.redirect('/');
  }
});

// Novo pedido - formulário
router.get('/novo', authRequired, async (req, res) => {
  try {
    const produtos = await Produto.findAll({
      where: { ativo: true },
      order: [['nome', 'ASC']]
    });
    
    res.render('pedidos/novo', {
      title: 'Novo Pedido',
      produtos
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    req.session.error_msg = 'Erro ao carregar formulário';
    res.redirect('/pedidos');
  }
});

// Processar novo pedido
router.post('/novo', authRequired, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { produtos, quantidades, observacoes } = req.body;
    
    // Parse dos dados
    const produtosArray = JSON.parse(produtos);
    const quantidadesArray = JSON.parse(quantidades);
    
    if (produtosArray.length === 0) {
      throw new Error('Nenhum produto selecionado');
    }
    
    // Calcular total
    let valorTotal = 0;
    const itensPedido = [];
    
    for (let i = 0; i < produtosArray.length; i++) {
      const produtoId = produtosArray[i];
      const quantidade = parseInt(quantidadesArray[i]);
      
      const produto = await Produto.findByPk(produtoId, { transaction });
      if (!produto) {
        throw new Error(`Produto não encontrado: ${produtoId}`);
      }
      
      const subtotal = produto.preco_custo * quantidade;
      valorTotal += subtotal;
      
      itensPedido.push({
        produto_id: produtoId,
        quantidade,
        preco_unitario: produto.preco_custo,
        subtotal
      });
    }
    
    // Criar pedido
    const pedido = await PedidoFornecimento.create({
      funcionario_id: req.session.user.funcionarioId,
      valor_total: valorTotal,
      observacoes,
      status: 'pendente'
    }, { transaction });
    
    // Adicionar itens ao pedido
    for (let item of itensPedido) {
      await ItemPedido.create({
        pedido_id: pedido.id,
        ...item
      }, { transaction });
    }
    
    await transaction.commit();
    
    req.session.success_msg = `Pedido #${pedido.id} criado com sucesso!`;
    res.redirect('/pedidos');
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar pedido:', error);
    req.session.error_msg = error.message || 'Erro ao criar pedido';
    res.redirect('/pedidos/novo');
  }
});

// Detalhes do pedido
router.get('/:id', authRequired, async (req, res) => {
  try {
    const pedido = await PedidoFornecimento.findByPk(req.params.id, {
      include: [
        { model: Funcionario, attributes: ['nome'] },
        { 
          model: ItemPedido, 
          include: [{ model: Produto, attributes: ['nome', 'codigo_barras'] }]
        }
      ]
    });
    
    if (!pedido) {
      req.session.error_msg = 'Pedido não encontrado';
      return res.redirect('/pedidos');
    }
    
    res.render('pedidos/detalhes', {
      title: `Pedido #${pedido.id}`,
      pedido
    });
  } catch (error) {
    console.error('Erro ao carregar pedido:', error);
    req.session.error_msg = 'Erro ao carregar pedido';
    res.redirect('/pedidos');
  }
});

// Receber pedido
router.post('/receber/:id', authRequired, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const pedido = await PedidoFornecimento.findByPk(req.params.id, {
      include: [{
        model: ItemPedido,
        include: [Produto]
      }],
      transaction
    });
    
    if (!pedido) {
      throw new Error('Pedido não encontrado');
    }
    
    if (pedido.status === 'concluido') {
      throw new Error('Pedido já foi concluído');
    }
    
    // Atualizar estoque
    for (let item of pedido.ItemPedidos) {
      await Produto.increment('quantidade_estoque', {
        by: item.quantidade,
        where: { id: item.produto_id },
        transaction
      });
      
      // Marcar item como recebido
      await item.update({ 
        quantidade_recebida: item.quantidade 
      }, { transaction });
    }
    
    // Atualizar status do pedido
    await pedido.update({ 
      status: 'concluido',
      data_entrega: new Date()
    }, { transaction });
    
    await transaction.commit();
    
    req.session.success_msg = `Pedido #${pedido.id} recebido com sucesso! Estoque atualizado.`;
    res.redirect('/pedidos');
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao receber pedido:', error);
    req.session.error_msg = error.message || 'Erro ao receber pedido';
    res.redirect('/pedidos');
  }
});

// Cancelar pedido
router.post('/cancelar/:id', authRequired, async (req, res) => {
  try {
    const pedido = await PedidoFornecimento.findByPk(req.params.id);
    
    if (!pedido) {
      req.session.error_msg = 'Pedido não encontrado';
      return res.redirect('/pedidos');
    }
    
    if (pedido.status === 'concluido') {
      req.session.error_msg = 'Não é possível cancelar um pedido concluído';
      return res.redirect('/pedidos');
    }
    
    await pedido.update({ status: 'cancelado' });
    
    req.session.success_msg = `Pedido #${pedido.id} cancelado com sucesso!`;
    res.redirect('/pedidos');
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    req.session.error_msg = 'Erro ao cancelar pedido';
    res.redirect('/pedidos');
  }
});

module.exports = router;