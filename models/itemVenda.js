const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemVenda = sequelize.define('ItemVenda', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  preco_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'itens_venda'
});

module.exports = ItemVenda;