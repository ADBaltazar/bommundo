const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MovimentoCaixa = sequelize.define('MovimentoCaixa', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  data_movimento: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  descricao: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('entrada', 'saida'),
    allowNull: false
  },
  categoria: {
    type: DataTypes.ENUM('venda', 'despesa', 'outros'),
    allowNull: false
  }
}, {
  tableName: 'movimentos_caixa'
});

module.exports = MovimentoCaixa;