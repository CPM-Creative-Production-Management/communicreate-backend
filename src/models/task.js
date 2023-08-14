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
    is_complete: {
        type: DataTypes.BOOLEAN,
    }
}, {
    freezeTableName: true,
})

module.exports = Task