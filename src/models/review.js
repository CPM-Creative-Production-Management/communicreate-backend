const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Review = sequelize.define('Review', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    freezeTableName: true,
})

module.exports = Review