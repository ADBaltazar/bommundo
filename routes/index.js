const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const models = require('../models');

/* ────────────────────────────────────────────────────────────
   Modelos — cada um pode ou não existir
   ──────────────────────────────────────────────────────────── */
const {
  Venda,
  Produto,
  Caixa,
  Cliente,
  Funcionario,
  ItemVenda,
  MovimentoCaixa,
  Categoria,
  PedidoFornecimento,
  Producao
} = models;

/* Filtra models válidos (evita "Include unexpected") */
const isValidModel = m => m && typeof m.findAll === 'function';

/* Pega o primeiro nome de associação que existir */
function pickAssociation(assocs, candidates) {
  if (!assocs) return undefined;
  for (const name of candidates) {
    if (assocs[name]) return name;
  }
  return undefined;
}

/* ────────────────────────────────────────────────────────────
   Middleware
   ──────────────────────────────────────────────────────────── */
const authRequired = (req, res, next) => {
  if (!req.session.user) {
    console.log('[auth] Sem permissão — redirecionando para login');
    return res.redirect('/auth/login');
  }
  next();
};

/* ────────────────────────────────────────────────────────────
   Raiz
   ──────────────────────────────────────────────────────────── */
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  return res.redirect('/auth/login');
});

/* ────────────────────────────────────────────────────────────
   Dashboard
   ──────────────────────────────────────────────────────────── */
router.get('/dashboard', authRequired, async (req, res) => {
  const agora = new Date();
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  const u = req.session.user || {};
  const utilizadorNome = u.nome || u.username || u.name || 'Operador';

  const fallback = {
    title: 'Dashboard',
    utilizador: utilizadorNome,
    currentPath: req.path,
    Utilizador: u,
    vendas: [],
    produtos: [],
    caixas: [],
    clientes: [],
    caixaAberto: null,
    totalVendasHoje: 0,
    vendasHoje: 0,
    pedidosPendentes: 0,
    producaoAndamento: 0,
    produtosEstoqueBaixo: [],
    error_msg: null
  };

  /* ──────────────────────────────────────────────────────────
     CARREGAMENTO — cada query com o seu try/catch
     ────────────────────────────────────────────────────────── */
  let vendas = [], produtos = [], caixas = [], clientes = [];
  let pedidosPendentes = 0, producaoAndamento = 0;

  /* ─── 1) Vendas ─── */
  if (isValidModel(Venda)) {
    const includes = [];

    if (isValidModel(Funcionario)) {
      includes.push({ model: Funcionario, attributes: ['id', 'nome'], required: false });
    }
    if (isValidModel(Cliente)) {
      includes.push({ model: Cliente, attributes: ['id', 'nome'], required: false });
    }
    if (isValidModel(ItemVenda)) {
      const itemInc = { model: ItemVenda, required: false };
      const assocName = pickAssociation(Venda.associations, [
        'ItemVendas', 'ItemVenda', 'itens', 'Itens', 'items'
      ]);
      if (assocName) itemInc.as = assocName;

      if (isValidModel(Produto)) {
        const prodInc = { model: Produto, required: false, attributes: ['id', 'nome'] };
        if (isValidModel(Categoria) && Produto.associations && Produto.associations.Categoria) {
          prodInc.attributes.push('categoria_id');
          prodInc.include = [{ model: Categoria, attributes: ['id', 'nome'], required: false }];
        }
        itemInc.include = [prodInc];
      }
      includes.push(itemInc);
    }

    try {
      vendas = await Venda.findAll({
        where: { data_venda: { [Op.gte]: inicioMesAnterior } },
        include: includes.length ? includes : undefined,
        order: [['data_venda', 'DESC']]
      });
    } catch (e) {
      console.warn('[dashboard] Venda com includes falhou:', e.message);
      try {
        vendas = await Venda.findAll({
          where: { data_venda: { [Op.gte]: inicioMesAnterior } },
          order: [['data_venda', 'DESC']]
        });
      } catch (e2) {
        console.warn('[dashboard] Venda sem includes falhou:', e2.message);
      }
    }
  }

  /* ─── 2) Produtos ─── */
  if (isValidModel(Produto)) {
    try {
      produtos = await Produto.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });
    } catch (e) {
      console.warn('[dashboard] Produto falhou:', e.message);
      try {
        produtos = await Produto.findAll({ order: [['nome', 'ASC']] });
      } catch (e2) {
        console.warn('[dashboard] Produto sem filtro falhou:', e2.message);
      }
    }
  }

  /* ─── 3) Caixas ─── */
  if (isValidModel(Caixa)) {
    const includes = [];

    if (isValidModel(Funcionario)) {
      includes.push({ model: Funcionario, attributes: ['id', 'nome'], required: false });
    }
    if (isValidModel(MovimentoCaixa)) {
      const movInc = { model: MovimentoCaixa, required: false };
      const assocName = pickAssociation(Caixa.associations, [
        'MovimentoCaixas', 'MovimentoCaixa', 'movimentos', 'Movimentos'
      ]);
      if (assocName) movInc.as = assocName;
      includes.push(movInc);
    }

    /* Se `u.id` existir filtra por ele; senão traz todos (view filtra depois) */
    const whereCaixa = u.id
      ? { funcionario_id: u.id, status: 'aberto' }
      : { status: 'aberto' };

    try {
      caixas = await Caixa.findAll({
        where: whereCaixa,
        include: includes.length ? includes : undefined,
        order: [['data_abertura', 'DESC']]
      });
    } catch (e) {
      console.warn('[dashboard] Caixa com includes falhou:', e.message);
      try {
        caixas = await Caixa.findAll({
          where: whereCaixa,
          order: [['data_abertura', 'DESC']]
        });
      } catch (e2) {
        console.warn('[dashboard] Caixa sem includes falhou:', e2.message);
      }
    }
  }

  /* ─── 4) Clientes ─── */
  if (isValidModel(Cliente)) {
    try {
      clientes = await Cliente.findAll({ attributes: ['id', 'nome'] });
    } catch (e) {
      console.warn('[dashboard] Cliente falhou:', e.message);
    }
  }

  /* ─── 5) Pedidos + Produção (opcionais) ─── */
  if (isValidModel(PedidoFornecimento)) {
    try {
      pedidosPendentes = await PedidoFornecimento.count({
        where: { status: 'pendente' }
      });
    } catch (e) {
      console.warn('[dashboard] PedidoFornecimento falhou:', e.message);
    }
  }

  if (isValidModel(Producao)) {
    try {
      producaoAndamento = await Producao.count({
        where: { status: { [Op.in]: ['pendente', 'em_producao'] } }
      });
    } catch (e) {
      console.warn('[dashboard] Producao falhou:', e.message);
    }
  }

  /* ──────────────────────────────────────────────────────────
     CÁLCULOS DERIVADOS
     ────────────────────────────────────────────────────────── */
  const caixaAberto = caixas.find(c => c.status === 'aberto') || null;

  const hojeIni = new Date(); hojeIni.setHours(0, 0, 0, 0);
  const vendasHojeArr = vendas.filter(v => {
    try { return new Date(v.data_venda) >= hojeIni; } catch (e) { return false; }
  });
  const totalVendasHoje = vendasHojeArr.reduce(
    (s, v) => s + Number(v.valor_total || 0), 0
  );

  const produtosEstoqueBaixo = produtos
    .filter(p => Number(p.quantidade_estoque || 0) <= Number(p.quantidade_minima || 0))
    .slice(0, 5);

  /* ──────────────────────────────────────────────────────────
     RENDER — passa tudo o que a view espera
     ────────────────────────────────────────────────────────── */
  return res.render('dashboard', {
    title: 'Dashboard',
    utilizador: utilizadorNome,
    currentPath: req.path,
    Utilizador: u,

    vendas,
    produtos,
    caixas,
    clientes,

    caixaAberto,
    totalVendasHoje,
    vendasHoje: vendasHojeArr.length,
    pedidosPendentes,
    producaoAndamento,
    produtosEstoqueBaixo,

    error_msg: null
  });
});

module.exports = router;