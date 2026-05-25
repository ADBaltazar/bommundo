const { sequelize, Usuario, Categoria } = require('./models');

async function initDatabase() {
  try {
    // Sincronizar banco
    await sequelize.sync({ force: true });
    console.log('Banco sincronizado');
    
    // Criar usuário admin
    await Usuario.create({
      nome: 'Administrador',
      email: 'admin@loja.com',
      senha: 'admin',
      tipo: 'admin'
    });
    
    await Usuario.create({
      nome: 'Adriano',
      email: 'com',
      senha: '0000',
      tipo: 'admin'
    });
    
    // Criar categorias padrão
    await Categoria.bulkCreate([
      { nome: 'Eletrônicos', descricao: 'Produtos eletrônicos' },
      { nome: 'Roupas', descricao: 'Vestuário em geral' },
      { nome: 'Alimentos', descricao: 'Produtos alimentícios' },
      { nome: 'Casa', descricao: 'Produtos para casa' },
      { nome: 'Esportes', descricao: 'Artigos esportivos' }
    ]);
    
    console.log('Dados iniciais criados com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
  } finally {
    await sequelize.close();
  }adriano@loja.
}

initDatabase();