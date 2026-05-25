const sequelize = require('../config/database');
const Usuario = require('./usuario');
const Funcionario = require('./funcionario');
const Produto = require('./produto');
const Categoria = require('./categoria');
const Venda = require('./venda');
const ItemVenda = require('./itemVenda');
const Caixa = require('./caixa');
const MovimentoCaixa = require('./movimentoCaixa');
const PedidoFornecimento = require('./pedidoFornecimento');
const ItemPedido = require('./itemPedido');
const Producao = require('./producao');

// Relacionamentos
Usuario.hasOne(Funcionario, { foreignKey: 'usuario_id' });
Funcionario.belongsTo(Usuario, { foreignKey: 'usuario_id' });

Categoria.hasMany(Produto, { foreignKey: 'categoria_id' });
Produto.belongsTo(Categoria, { foreignKey: 'categoria_id' });

Funcionario.hasMany(Venda, { foreignKey: 'funcionario_id' });
Venda.belongsTo(Funcionario, { foreignKey: 'funcionario_id' });

Caixa.hasMany(Venda, { foreignKey: 'caixa_id' });
Venda.belongsTo(Caixa, { foreignKey: 'caixa_id' });

Venda.hasMany(ItemVenda, { foreignKey: 'venda_id' });
ItemVenda.belongsTo(Venda, { foreignKey: 'venda_id' });

Produto.hasMany(ItemVenda, { foreignKey: 'produto_id' });
ItemVenda.belongsTo(Produto, { foreignKey: 'produto_id' });

Funcionario.hasMany(Caixa, { foreignKey: 'funcionario_id' });
Caixa.belongsTo(Funcionario, { foreignKey: 'funcionario_id' });

Caixa.hasMany(MovimentoCaixa, { foreignKey: 'caixa_id' });
MovimentoCaixa.belongsTo(Caixa, { foreignKey: 'caixa_id' });

PedidoFornecimento.hasMany(ItemPedido, { foreignKey: 'pedido_id' });
ItemPedido.belongsTo(PedidoFornecimento, { foreignKey: 'pedido_id' });

Produto.hasMany(ItemPedido, { foreignKey: 'produto_id' });
ItemPedido.belongsTo(Produto, { foreignKey: 'produto_id' });

Funcionario.hasMany(PedidoFornecimento, { foreignKey: 'funcionario_id' });
PedidoFornecimento.belongsTo(Funcionario, { foreignKey: 'funcionario_id' });

Funcionario.hasMany(Producao, { foreignKey: 'funcionario_solicitante_id' });
Producao.belongsTo(Funcionario, { foreignKey: 'funcionario_solicitante_id', as: 'Solicitante' });

Funcionario.hasMany(Producao, { foreignKey: 'funcionario_responsavel_id' });
Producao.belongsTo(Funcionario, { foreignKey: 'funcionario_responsavel_id', as: 'Responsavel' });

module.exports = {
  sequelize,
  Usuario,
  Funcionario,
  Produto,
  Categoria,
  Venda,
  ItemVenda,
  Caixa,
  MovimentoCaixa,
  PedidoFornecimento,
  ItemPedido,
  Producao
};