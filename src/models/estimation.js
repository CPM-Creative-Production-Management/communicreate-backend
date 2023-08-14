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
    },
    is_rejected: {
        type: DataTypes.BOOLEAN,
    },
    cost: {
        type: DataTypes.FLOAT,
    },
    deadline: {
        type: DataTypes.DATEONLY,
    }
}, {
    freezeTableName: true,
})

module.exports = Estimation