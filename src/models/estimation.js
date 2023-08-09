const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Estimation = sequelize.define('Estimation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.TEXT,
    },
    description: {
        type: DataTypes.TEXT,
    },
    is_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    is_rejected: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    cost: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    deadline: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
}, {
    freezeTableName: true,
})

module.exports = Estimation