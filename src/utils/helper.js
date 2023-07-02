const sequelize = require('../db/db')
const { DataTypes } = require("sequelize")
const User = require('../models/user')(sequelize, DataTypes)

const createUser = async (username, password, type) => {
    try {
        console.log(User)
        const newUser = await User.create({
          username: username,
          password: password,
          type: type
        });
        console.log('User created:', newUser);
        return true
      } catch (error) {
        console.error('Error creating user:', error);
        return false
      }
}

module.exports = { createUser }