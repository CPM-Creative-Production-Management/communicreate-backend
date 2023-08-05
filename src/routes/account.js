const express = require('express')
const router = express.Router()
const passport = require('passport')
const jwt = require('jsonwebtoken')
const decodeToken = require('../utils/helper').decodeToken
const { createUser } = require('../utils/helper')
const { Agency, Company, User } = require('../models/associations')

router.post('/login', passport.authenticate('local', { session: false }), async (req, res) => {
    // Successful authentication
  
    // Create a JWT payload
    const payload = {
        username: req.user.get('username'),
        email: req.user.get('email'),
        type: req.user.get('type'),
        associatedId: req.user.get('associatedId')
    };

    // Generate a JWT with a secret key
    const token = jwt.sign(payload, 'catto');
    const email = req.user.get('email')
    // exclude password from user 
    const user = await User.findOne({where: {email: email}, attributes: {exclude: ['password', 'username', 'id']}})
    if (user.type === 1) {
        const company = await Company.findByPk(user.associatedId)
        user.company = company
        user.dataValues.association = company
    } else if (user.type === 2) {
        const agency = await Agency.findByPk(user.associatedId)
        user.agency = agency
        user.dataValues.association = agency
    }

    // Send the JWT to the user
    res.json({ token, user });
  });

  router.get('/logout', function(req, res, next) {
    res.json({message: 'Successfully logged out'})
});

router.post('/signup', (req, res, next) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    const type = req.body.type
    const associatedId = req.body.associatedId

    const user = User.findOne({where: {email: email}})
    if(user) {
        return res.status(401).json({
            message: 'User already exists'
        })
    }

    if(createUser(name, email, password, type, associatedId)) {
        return res.status(200).json({
            message: 'User successfully created'
        })
    } else {
        return res.status(401).json({
            message: 'User creation unsuccessful'
        })
    }
})

// get profile of user
router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedType = decodedToken.type
    const associatedId = decodedToken.associatedId
    const user = await User.findOne({where: {username: decodedToken.username}})
    if(associatedType === 1) {
        // is a client, find company
        const company = await Company.findByPk(associatedId)
        user.dataValues.company = company
        user.dataValues.type = 'client'
        res.status(200).json(user)
    }
    else if (associatedType === 2) {
        // is a professional, find agency
        const agency = await Agency.findByPk(associatedId)
        user.dataValues.agency = agency
        user.dataValues.type = 'agency'
        res.status(200).json(user)
    } else {
        res.status(401).json({message: "Incorrect JWT token"})
    }
})

module.exports = router