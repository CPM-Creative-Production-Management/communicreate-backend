const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');
const Agency = require('./agency')
const Company = require('./company')

module.exports = function(sequelize, Sequelize) {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
            notEmpty: true,
        },
        type: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true
        },
        profile_picture: {
            type: DataTypes.STRING,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        admin_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        unique_string: {
            type: DataTypes.STRING,
        }
    },{
        timestamps: false,
    })
    // a user can either be an agency manager, or a company client
    User.belongsTo(Agency, { foreignKey: 'associatedId', constraints: false });
    User.belongsTo(Company, { foreignKey: 'associatedId', constraints: false });
   
    User.prototype.validPassword = function (password) {
        return this.password === password
    }

    User.prototype.getUserAssociated = async function () {
    if (this.type === 2) {
    return await this.getAgency();
    } else if (this.type === 1) {
    return await this.getCompany();
    }
    return null;
    };

    return User
}