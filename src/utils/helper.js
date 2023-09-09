const sequelize = require('../db/db')
const { DataTypes } = require("sequelize")
const User = require('../models/user')(sequelize, DataTypes)
const jwt = require('jsonwebtoken')
// const Agency = require('../models/agency')
// const Company = require('../models/company')
const { Comment, Agency, Company } = require('../models/associations')
const { sendMail } = require('./mail') 
// import unique string generating
const crypto = require("crypto");

const createUser = async (name, email, password, type, associatedId) => {
    try {
        const uniqueString = crypto.randomUUID({ disableEntropyCache: true })
        const newUser = await User.create({
          name: name,
          email: email,
          password: password,
          type: parseInt(type),
          unique_string: uniqueString
        });
        await sendMail(email, 'Verify your email', `Click on the link to verify your email: ${process.env.FRONTEND_URL}/verify/${uniqueString}`)
    
        const typeInt = parseInt(type)
        if (typeInt === 1) {
          console.log('Adding user to company')
          const company = await Company.findByPk(associatedId)
          await company.addUser(newUser)
          console.log('User added to company')
        }
        else if (typeInt === 2) {
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

const getCommentsRecursive = async (comment) => {
  console.log(comment.dataValues.body)
  const user = await comment.getUser()
  const association = await user.getUserAssociated()
  console.log(user.dataValues.type)
  comment.dataValues.User.dataValues.association = association
  const replies = await comment.getReplies({
    // order by created at
    order: [
      ['createdAt', 'ASC']
    ]
  })
  const likes = await comment.getLikes({
    attributes: ['id', 'name', 'email', 'type']
  })
  comment.dataValues.likes = likes
  comment.dataValues.totalLikes = likes.length
  if (replies.length > 0) {
    for (let i = 0; i < replies.length; i++) {
      const reply = replies[i]
      const user = await reply.getUser({
        attributes: ['id', 'name', 'email', 'type', 'profile_picture']
      })
      const association = await user.getUserAssociated()
      reply.dataValues.User = user
      reply.dataValues.User.dataValues.association = association
      console.log('going to recursion')
      const replyReplies = await getCommentsRecursive(reply)
      replies[i].dataValues.replies = replyReplies
    }
  }
  comment.dataValues.replies = replies
  return replies
}

module.exports = { createUser, decodeToken, getCommentsRecursive }

