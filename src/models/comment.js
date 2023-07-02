const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Comment = sequelize.define('Comment', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
}, {
    freezeTableName: true,
})

module.exports = Comment