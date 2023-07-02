const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

module.exports = function(sequelize, Sequelize) {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
            notEmpty: true,
        },
        type: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    },{
        timestamps: false,
        
    })
    User.prototype.validPassword = function (password) {
        return this.password === password
    }

    return User
}