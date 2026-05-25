const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PedidoFornecimento = sequelize.define('PedidoFornecimento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  data_pedido: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  data_prevista_entrega: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_entrega: {
    type: DataTypes.DATE,
    allowNull: true
  },
  valor_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pendente', 'processando', 'concluido', 'cancelado'),
    defaultValue: 'pendente'
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pedidos_fornecimento'
});

module.exports = PedidoFornecimento;