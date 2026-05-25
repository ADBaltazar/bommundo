const express = require('express');
const router = express.Router();
const { Producao, Funcionario } = require('../models');
const { Op } = require('sequelize');

// Middleware de autenticação
const authRequired = (req, res, next) => {
  if (!req.session.user) {
    req.session.error_msg = 'Você precisa fazer login para acessar esta página';
    return res.redirect('/auth/login');
  }
  next();
};

// Listar produção
router.get('/', authRequired, async (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = {};
    
    if (status && status !== 'todos') {
      whereClause.status = status;
    }
    
    const producoes = await Producao.findAll({
      where: whereClause,
      include: [
        { 
          model: Funcionario, 
          as: 'Solicitante',
          attributes: ['nome'] 
        },
        { 
          model: Funcionario, 
          as: 'Responsavel',
          attributes: ['nome'] 
        }
      ],
      order: [['data_solicitacao', 'DESC']]
    });
    
    res.render('producao/listar', {
      title: 'Controle de Produção',
      producoes,
      statusFiltro: status || 'todos'
    });
  } catch (error) {
    console.error('Erro ao buscar produção:', error);
    req.session.error_msg = 'Erro ao carregar produção';
    res.redirect('/');
  }
});

// Nova solicitação de produção - formulário
router.get('/nova', authRequired, async (req, res) => {
  try {
    const funcionarios = await Funcionario.findAll({
      where: { ativo: true },
      order: [['nome', 'ASC']]
    });
    
    res.render('producao/novo', {
      title: 'Nova Solicitação de Produção',
      funcionarios
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    req.session.error_msg = 'Erro ao carregar formulário';
    res.redirect('/producao');
  }
});

// Processar nova solicitação
router.post('/nova', authRequired, async (req, res) => {
  try {
    const { descricao, quantidade, prioridade, data_prevista, funcionario_responsavel_id } = req.body;
    
    const producao = await Producao.create({
      funcionario_solicitante_id: req.session.user.funcionarioId,
      funcionario_responsavel_id: funcionario_responsavel_id || null,
      descricao,
      quantidade: parseInt(quantidade) || 1,
      prioridade,
      data_prevista_conclusao: data_prevista || null,
      status: 'pendente'
    });
    
    req.session.success_msg = `Solicitação de produção #${producao.id} criada com sucesso!`;
    res.redirect('/producao');
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    req.session.error_msg = 'Erro ao criar solicitação';
    res.redirect('/producao/novo');
  }
});

// Detalhes da produção
router.get('/:id', authRequired, async (req, res) => {
  try {
    const producao = await Producao.findByPk(req.params.id, {
      include: [
        { 
          model: Funcionario, 
          as: 'Solicitante',
          attributes: ['nome'] 
        },
        { 
          model: Funcionario, 
          as: 'Responsavel',
          attributes: ['nome'] 
        }
      ]
    });
    
    if (!producao) {
      req.session.error_msg = 'Solicitação não encontrada';
      return res.redirect('/producao');
    }
    
    res.render('producao/detalhes', {
      title: `Produção #${producao.id}`,
      producao
    });
  } catch (error) {
    console.error('Erro ao carregar produção:', error);
    req.session.error_msg = 'Erro ao carregar produção';
    res.redirect('/producao');
  }
});

// Atualizar status da produção
router.post('/:id/status', authRequired, async (req, res) => {
  try {
    const { status } = req.body;
    const producao = await Producao.findByPk(req.params.id);
    
    if (!producao) {
      req.session.error_msg = 'Solicitação não encontrada';
      return res.redirect('/producao');
    }
    
    let updateData = { status };
    
    // Se estiver concluindo, registrar data de conclusão
    if (status === 'concluido') {
      updateData.data_conclusao = new Date();
    }
    
    // Se estiver cancelando, registrar data de conclusão como null
    if (status === 'cancelado') {
      updateData.data_conclusao = null;
    }
    
    await producao.update(updateData);
    
    req.session.success_msg = `Status da produção #${producao.id} atualizado para ${status}!`;
    res.redirect('/producao');
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    req.session.error_msg = 'Erro ao atualizar status';
    res.redirect('/producao');
  }
});

// Atribuir responsável
router.post('/:id/responsavel', authRequired, async (req, res) => {
  try {
    const { funcionario_responsavel_id } = req.body;
    const producao = await Producao.findByPk(req.params.id);
    
    if (!producao) {
      req.session.error_msg = 'Solicitação não encontrada';
      return res.redirect('/producao');
    }
    
    await producao.update({ 
      funcionario_responsavel_id: funcionario_responsavel_id || null
    });
    
    req.session.success_msg = `Responsável da produção #${producao.id} atualizado!`;
    res.redirect('/producao');
  } catch (error) {
    console.error('Erro ao atualizar responsável:', error);
    req.session.error_msg = 'Erro ao atualizar responsável';
    res.redirect('/producao');
  }
});

module.exports = router;