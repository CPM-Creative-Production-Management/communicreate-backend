const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    message: {
        type: DataTypes.STRING,
    },
    link: {
        type: DataTypes.STRING,
    },
    type: {
        type: DataTypes.STRING,
    }
}, {
    freezeTableName: true,
})

module.exports = Notification
