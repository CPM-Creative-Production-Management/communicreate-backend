const sequelize = require('../db/db')
const { DataTypes } = require("sequelize")
const User = require('../models/user')(sequelize, DataTypes)
const Agency = require('../models/agency')

const createUser = async (username, password, type, associatedId) => {
    try {
        console.log(User)
        const newUser = await User.create({
          username: username,
          password: password,
          type: type,
        });
        console.log('User created');
        if (type === 2) {
          console.log('Adding user to agency')
          const agency = await Agency.findByPk(associatedId)
          await agency.addUser(newUser)
          console.log('User added to agency')
        }
        return true
      } catch (error) {
        console.error('Error creating user:', error);
        return false
      }
}

module.exports = { createUser }