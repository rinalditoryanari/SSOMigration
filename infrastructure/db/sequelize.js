// Import Sequelize
require('dotenv').config();
const { Sequelize } = require('sequelize');


// Create a new Sequelize instance with your database credentials
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
});

// Export the Sequelize instance as a module
module.exports = sequelize;