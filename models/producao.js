const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Producao = sequelize.define('Producao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  data_solicitacao: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  data_prevista_conclusao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  data_conclusao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  status: {
    type: DataTypes.ENUM('pendente', 'em_producao', 'concluido', 'cancelado'),
    defaultValue: 'pendente'
  },
  prioridade: {
    type: DataTypes.ENUM('baixa', 'media', 'alta'),
    defaultValue: 'media'
  }
}, {
  tableName: 'producao'
});

module.exports = Producao;