const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Task = sequelize.define('Task', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
    },
    cost: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    // 0: incomplete, 1: request approval, 2: approved
    status: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // 0: not paid, 1: paid
    isPaid: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    sample_link: {
        type: DataTypes.STRING,    
    }
}, {
    freezeTableName: true,
})

module.exports = Task