const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const TaskTag = sequelize.define('TaskTag', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    freezeTableName: true,
    timestamps: false
})

module.exports = TaskTag