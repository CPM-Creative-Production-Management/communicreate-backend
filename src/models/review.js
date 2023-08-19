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
    },
    description: {
        type: DataTypes.STRING,
    },
    rating: {
        type: DataTypes.INTEGER,
    }
}, {
    freezeTableName: true,
})

module.exports = Review