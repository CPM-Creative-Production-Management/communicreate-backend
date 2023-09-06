const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    total_amount: {             //total amount of the project to be paid
        type: DataTypes.FLOAT,
        allowNull: false
    },
    paid_amount: {      //Total paid amount till now = sum of all 'amount' of all 'successful' installments from Payment_History table.
        type: DataTypes.FLOAT,
        allowNull: false
    },
    payment_type: {     //Full = 0 / Taskwise = 1
        type: DataTypes.STRING,
        defaultValue: 1
    }
}, {
    freezeTableName: true,
})

module.exports = Payment