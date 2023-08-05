const sequelize = require('../db/db')
const { DataTypes } = require("sequelize")
const User = require('../models/user')(sequelize, DataTypes)
const jwt = require('jsonwebtoken')
const Agency = require('../models/agency')

const createUser = async (email, password, type, associatedId) => {
    try {
        console.log(User)
        const newUser = await User.create({
          email: email,
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

const decodeToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    // Use the bearer token as needed
    try {
        const decodedToken = jwt.verify(bearerToken, 'catto');
        return decodedToken
      } catch (error) {
        console.error('Invalid token:', error.message);
        res.send('Did not work')
      }
  } else {
    console.log('not a token')
  }
}

module.exports = { createUser, decodeToken }

