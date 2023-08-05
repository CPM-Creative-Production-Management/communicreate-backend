const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Company = sequelize.define('Company', {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
    },
    address: {
        type: DataTypes.STRING,
    },
    phone: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
    },
    website: {
        type: DataTypes.STRING,
    },
    logo: {
        type: DataTypes.STRING,
    },
}, {
    freezeTableName: true,
    timestamps: false
})

module.exports = Company