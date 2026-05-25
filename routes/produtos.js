const express = require('express');
const router = express.Router();
const { Produto, Categoria } = require('../models');

// Middleware para verificar autenticação
const authRequired = (req, res, next) => {
  if (!req.session.user) {
    req.session.error_msg = 'Você precisa fazer login para acessar esta página';
    return res.redirect('/auth/login');
  }
  next();
};

// Listar produtos
router.get('/', authRequired, async (req, res) => {
  try {
    const produtos = await Produto.findAll({
      include: [{ model: Categoria }],
      order: [['nome', 'ASC']]
    });
    
    res.render('produtos/listar', { 
      title: 'Produtos',
      produtos 
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    req.session.error_msg = 'Erro ao carregar produtos';
    res.redirect('/');
  }
});

// Formulário para adicionar produto
router.get('/novo', authRequired, async (req, res) => {
  try {
    const categorias = await Categoria.findAll({ order: [['nome', 'ASC']] });
    res.render('produtos/novo', { 
      title: 'Adicionar Produto',
      categorias 
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    req.session.error_msg = 'Erro ao carregar formulário';
    res.redirect('/produtos');
  }
});

// Adicionar produto
router.post('/novo', authRequired, async (req, res) => {
  try {
    const { nome, descricao, codigo_barras, preco_custo, preco_venda, quantidade_estoque, quantidade_minima, categoria_id } = req.body;
    
    await Produto.create({
      nome,
      descricao,
      codigo_barras,
      preco_custo: parseFloat(preco_custo),
      preco_venda: parseFloat(preco_venda),
      quantidade_estoque: parseInt(quantidade_estoque),
      quantidade_minima: parseInt(quantidade_minima),
      categoria_id: categoria_id || null
    });
    
    req.session.success_msg = 'Produto adicionado com sucesso';
    res.redirect('/produtos');
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    req.session.error_msg = 'Erro ao adicionar produto';
    res.redirect('/produtos/novo');
  }
});

// Formulário para editar produto
router.get('/editar/:id', authRequired, async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);
    const categorias = await Categoria.findAll({ order: [['nome', 'ASC']] });
    
    if (!produto) {
      req.session.error_msg = 'Produto não encontrado';
      return res.redirect('/produtos');
    }
    
    res.render('produtos/editar', { 
      title: 'Editar Produto',
      produto,
      categorias 
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    req.session.error_msg = 'Erro ao carregar formulário';
    res.redirect('/produtos');
  }
});

// Editar produto
router.post('/editar/:id', authRequired, async (req, res) => {
  try {
    const { nome, descricao, codigo_barras, preco_custo, preco_venda, quantidade_estoque, quantidade_minima, categoria_id } = req.body;
    
    const produto = await Produto.findByPk(req.params.id);
    
    if (!produto) {
      req.session.error_msg = 'Produto não encontrado';
      return res.redirect('/produtos');
    }
    
    await produto.update({
      nome,
      descricao,
      codigo_barras,
      preco_custo: parseFloat(preco_custo),
      preco_venda: parseFloat(preco_venda),
      quantidade_estoque: parseInt(quantidade_estoque),
      quantidade_minima: parseInt(quantidade_minima),
      categoria_id: categoria_id || null
    });
    
    req.session.success_msg = 'Produto atualizado com sucesso';
    res.redirect('/produtos');
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    req.session.error_msg = 'Erro ao atualizar produto';
    res.redirect(`/produtos/editar/${req.params.id}`);
  }
});

// Excluir produto (soft delete)
router.post('/excluir/:id', authRequired, async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);
    
    if (!produto) {
      req.session.error_msg = 'Produto não encontrado';
      return res.redirect('/produtos');
    }
    
    await produto.update({ ativo: false });
    
    req.session.success_msg = 'Produto excluído com sucesso';
    res.redirect('/produtos');
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    req.session.error_msg = 'Erro ao excluir produto';
    res.redirect('/produtos');
  }
});

module.exports = router;