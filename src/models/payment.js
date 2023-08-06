const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

// Choice (Full / EMI----> N=3/6/12 months)
// Principal, P = Total Budget fixed in the Estimation
// Rate R = fixed by Agency in the Estimation
// P x R x (1+R)^N / [((1+R)^N)-1] 

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
    currency: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {                      //full or emi
        type: DataTypes.TEXT,
        allowNull: false
    },
    emi_installment_choice: {        //if total = 12, then total interest will be fixed for 12 months
        type: DataTypes.INTEGER,
        allowNull: true
    },
    installments_completed: {            //if this is 3 out of 12, then 3rd installment
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    freezeTableName: true,
})

module.exports = Payment