const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Employee = sequelize.define('Employee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    dob: {
        type: DataTypes.DATEONLY,
    },
    address: {
        type: DataTypes.TEXT
    },
    rating: {
        type: DataTypes.INTEGER
    },
    salary: {
        type: DataTypes.FLOAT
    },
    profile_picture: {
        type: DataTypes.STRING,
    },
    
    join_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    email: {
        type: DataTypes.STRING,

    },
    phone: {
        type: DataTypes.STRING
    }
}, {
    freezeTableName: true,
    timestamps: false
})

module.exports = Employee