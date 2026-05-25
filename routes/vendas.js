const express = require('express');
const router = express.Router();
const { Venda, ItemVenda, Produto, Funcionario, Caixa, MovimentoCaixa } = require('../models');
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

// Listar vendas
router.get('/', authRequired, async (req, res) => {
  try {
    const { data, status } = req.query;
    let whereClause = {};
    
    if (data) {
      const startDate = new Date(data);
      const endDate = new Date(data);
      endDate.setDate(endDate.getDate() + 1);
      
      whereClause.data_venda = {
        [Op.gte]: startDate,
        [Op.lt]: endDate
      };
    }
    
    if (status && status !== 'todos') {
      whereClause.status = status;
    }
 
    const vendas = await Venda.findAll({
      where: whereClause,
      include: [
        { model: Funcionario, attributes: ['nome'] },
        { model: Caixa, attributes: ['id','funcionario_id'] }
      ],
      order: [['data_venda', 'DESC']]
    });

    const ID_Funcionario = req.session.user.id
    const caixaAberto = await Caixa.findOne({where:{status: 'aberto',funcionario_id: ID_Funcionario}})

    console.log(caixaAberto)

    res.render('vendas/listar', {
      title: 'Vendas',
      vendas,
      dataFiltro: data || '',
      statusFiltro: status || 'todos',
      utilizador:req.session.user.id,
      EstadoCaixa: caixaAberto
    });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    req.session.error_msg = 'Erro ao carregar vendas';
    res.redirect('/');
  }
});

// Nova venda - página inicial
router.get('/nova', authRequired, async (req, res) => {
  try {
    // Verificar se há caixa aberto
    const caixaAberto = await Caixa.findOne({
      where: { status: 'aberto', funcionario_id: req.session.user.id }
    });
    
    const produtos = await Produto.findAll({
      where: { ativo: true, quantidade_estoque: { [Op.gt]: 0 } },
      order: [['nome', 'ASC']]
    });
    
    res.render('vendas/nova', {
      title: 'Nova Venda',
      produtos,
      caixa: caixaAberto
    });
  } catch (error) {
    console.error('Erro ao carregar página de venda:', error);
    req.session.error_msg = 'Erro ao carregar página de venda';
    res.redirect('/vendas');
  }
});

// Processar venda
router.post('/nova', authRequired, async (req, res) => {
  console.log('Chegueiiiiiiiiiiiii em procesaaaaaaar  vendas .... ')
  const transaction = await sequelize.transaction();
  
  try {
    const { produtos, quantidades, forma_pagamento, desconto } = req.body;
    const funcionarioId = req.session.user.id;
    
    // Verificar se há caixa aberto
    const caixaAberto = await Caixa.findOne({
      where: { status: 'aberto', funcionario_id: funcionarioId },
      transaction
    });
    
    if (!caixaAberto) {
      throw new Error('Não há caixa aberto. Abra um caixa antes de realizar vendas.');
    }
    
    // Parse dos dados
    const produtosArray = JSON.parse(produtos);
    const quantidadesArray = JSON.parse(quantidades);
    
    if (produtosArray.length === 0) {
      throw new Error('Nenhum produto selecionado');
    }
    
    // Calcular total e verificar estoque
    let valorTotal = 0;
    const itensVenda = [];
    
    for (let i = 0; i < produtosArray.length; i++) {
      const produtoId = produtosArray[i];
      const quantidade = parseInt(quantidadesArray[i]);
      
      const produto = await Produto.findByPk(produtoId, { transaction });
      if (!produto) {
        throw new Error(`Produto não encontrado: ${produtoId}`);
      }
      
      if (produto.quantidade_estoque < quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.quantidade_estoque}`);
      }
      
      const subtotal = produto.preco_venda * quantidade;
      valorTotal += subtotal;
      
      itensVenda.push({
        produto_id: produtoId,
        quantidade,
        preco_unitario: produto.preco_venda,
        subtotal
      });
      
      // Atualizar estoque
      await produto.decrement('quantidade_estoque', { by: quantidade, transaction });
    }
    
    // Aplicar desconto
    const descontoValue = parseFloat(desconto) || 0;
    const valorFinal = Math.max(0, valorTotal - descontoValue);
    
    // Criar venda
    const venda = await Venda.create({
      funcionario_id: funcionarioId,
      caixa_id: caixaAberto.id,
      valor_total: valorFinal,
      desconto: descontoValue,
      forma_pagamento,
      status: 'concluida'
    }, { transaction });
    
    // Adicionar itens à venda
    for (let item of itensVenda) {
      await ItemVenda.create({
        venda_id: venda.id,
        ...item
      }, { transaction });
    }
    
    // Atualizar caixa
    await MovimentoCaixa.create({
      caixa_id: caixaAberto.id,
      descricao: `Venda #${venda.id}`,
      valor: valorFinal,
      tipo: 'entrada',
      categoria: 'venda'
    }, { transaction });
    
    await caixaAberto.increment('valor_total_vendas', { by: valorFinal, transaction });
    
    await transaction.commit();
    
    req.session.success_msg = `Venda #${venda.id} realizada com sucesso! Total: R$ ${valorFinal.toFixed(2)}`;
    res.redirect('/vendas');
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao processar venda:', error);
    req.session.error_msg = error.message || 'Erro ao processar venda';
    res.redirect('/vendas/nova');
  }
});



// Detalhes da venda
router.get('/:id', authRequired, async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id, {
      include: [
        { model: Funcionario, attributes: ['nome'] },
        { model: Caixa, attributes: ['id'] },
        { 
          model: ItemVenda, 
          include: [{ model: Produto, attributes: ['nome', 'codigo_barras'] }]
        }
      ]
    });
    
    if (!venda) {
      req.session.error_msg = 'Venda não encontrada';
      return res.redirect('/vendas');
    }
    
    res.render('vendas/detalhes', {
      title: `Venda #${venda.id}`,
      venda
    });
  } catch (error) {
    console.error('Erro ao carregar venda:', error);
    req.session.error_msg = 'Erro ao carregar venda';
    res.redirect('/vendas');
  }
});

// Cancelar venda
router.get('/cancelar/:id', authRequired, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const venda = await Venda.findByPk(req.params.id, {
      include: [{
        model: ItemVenda,
        include: [Produto]
      }],
      transaction
    });
    
    if (!venda) {
      throw new Error('Venda não encontrada');
    }
    
    if (venda.status === 'cancelada') {
      throw new Error('Venda já está cancelada');
    }
    
    // Restaurar estoque
    for (let item of venda.ItemVendas) {
      await Produto.increment('quantidade_estoque', {
        by: item.quantidade,
        where: { id: item.produto_id },
        transaction
      });
    }
    
    // Reverter movimento no caixa se a venda estava concluída
    if (venda.status === 'concluida') {
      await MovimentoCaixa.create({
        caixa_id: venda.caixa_id,
        descricao: `Cancelamento Venda #${venda.id}`,
        valor: venda.valor_total,
        tipo: 'saida',
        categoria: 'venda'
      }, { transaction });
      
      const caixa = await Caixa.findByPk(venda.caixa_id, { transaction });
      await caixa.decrement('valor_total_vendas', { by: venda.valor_total, transaction });
    }
    
    // Atualizar status da venda
    await venda.update({ status: 'cancelada' }, { transaction });
    
    await transaction.commit();
    
    req.session.success_msg = `Venda #${venda.id} cancelada com sucesso`;
    res.redirect('/vendas');
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao cancelar venda:', error);
    req.session.error_msg = error.message || 'Erro ao cancelar venda';
    res.redirect('/vendas');
  }
});

module.exports = router;