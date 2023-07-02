const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Tag = sequelize.define('Tag', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tag: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    freezeTableName: true,
    timestamps: false
})

module.exports = Tag