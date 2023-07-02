const Sequelize = require('sequelize');

require('dotenv').config({path: '../../.env'});

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false

})

module.exports = sequelize