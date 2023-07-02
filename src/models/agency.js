const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');

const Agency = sequelize.define('Agency', {

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
    }
}, {
    freezeTableName: true,
    timestamps: false
})

Agency.prototype.addUser = async function (user) {
    user.associatedId = this.id;
    user.associatedType = 2;
    await user.save();
};

Agency.prototype.getUsers = async function () {
    return User.findAll({
      where: {
        associatedId: this.id,
        associatedType: 2
      }
    });
  };

module.exports = Agency