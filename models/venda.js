const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venda = sequelize.define('Venda', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  data_venda: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  valor_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  desconto: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  forma_pagamento: {
    type: DataTypes.ENUM('dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'transferencia'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pendente', 'concluida', 'cancelada'),
    defaultValue: 'concluida'
  }
}, {
  tableName: 'vendas'
});

module.exports = Venda;