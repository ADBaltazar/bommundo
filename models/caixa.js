const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Caixa = sequelize.define('Caixa', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  data_abertura: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  data_fechamento: {
    type: DataTypes.DATE,
    allowNull: true
  },
  valor_abertura: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  valor_fechamento: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  valor_total_vendas: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  valor_total_despesas: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  saldo_final: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('aberto', 'fechado'),
    defaultValue: 'aberto'
  }
}, {
  tableName: 'caixas'
});

module.exports = Caixa;