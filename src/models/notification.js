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
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    freezeTableName: true,
})

module.exports = Notification
