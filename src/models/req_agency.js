const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const ReqAgency = sequelize.define('ReqAgency', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    accepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    finalized: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    freezeTableName: true,
    timestamps: false
})

module.exports = ReqAgency