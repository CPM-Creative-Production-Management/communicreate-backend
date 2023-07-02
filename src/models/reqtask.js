const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const RequestTask = sequelize.define('RequestTask', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    }
}, {
    freezeTableName: true,
    timestamps: false
})

module.exports = RequestTask