const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produto = sequelize.define('Produto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  codigo_barras: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  preco_custo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  preco_venda: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  quantidade_estoque: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  quantidade_minima: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'produtos'
});

module.exports = Produto;