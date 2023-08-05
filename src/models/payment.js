const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    currency: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    transaction_id: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    freezeTableName: true,
})

module.exports = Payment