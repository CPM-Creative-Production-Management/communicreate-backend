const express = require('express')
const router = express.Router()
const passport = require('passport')
const jwt = require('jsonwebtoken')
const decodeToken = require('../utils/helper').decodeToken
const { createUser } = require('../utils/helper')
const { Agency, Company, User, Tag } = require('../models/associations')
const {sendMail} = require('../utils/mail')

router.post('/login', passport.authenticate('local', { session: false }), async (req, res) => {
    // Successful authentication
    // Create a JWT payload
    const payload = {
        username: req.user.get('username'),
        email: req.user.get('email'),
        type: req.user.get('type'),
        associatedId: req.user.get('associatedId'),
        id: req.user.get('id')
    };

    // Generate a JWT with a secret key
    const token = jwt.sign(payload, 'catto');
    const email = req.user.get('email')
    // exclude password from user 
    const user = await User.findOne({where: {email: email}, attributes: {exclude: ['password', 'username', 'id']}})
    if (!user.is_verified) {
        return res.json({
            responseCode: 0,
            message: 'Please verify your email'
        })
    }
    if (!user.admin_approved) {
        return res.json({
            responseCode: 0,
            message: 'Please wait for admin approval'
        })
    }
    if (user.type === 1) {
        const company = await Company.findByPk(user.associatedId)
        console.log(user.associatedId)
        user.company = company
        user.dataValues.association = company
    } else if (user.type === 2) {
        const agency = await Agency.findByPk(user.associatedId)
        user.agency = agency
        user.dataValues.association = agency
    }
    // Send the JWT to the user
    return res.json({
        responseCode: 1,
        message: 'Successfully logged in',
        token,
        user,
        });
  });

  router.get('/logout', function(req, res, next) {
    res.json({message: 'Successfully logged out'})
});

router.post('/signup', async (req, res, next) => {
    console.log(req.body)
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    const type = req.body.type
    const associatedId = req.body.associatedId
    
    const user = await User.findOne({where: {email: email}})
    if(user) {
        console.log(user)
        return res.status(401).json({
            message: 'User already exists'
        })
    }

    if(createUser(name, email, password, type, associatedId)) {
        return res.status(200).json({
            message: 'Verification email sent'
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
    const user = await User.findOne({where: {email: decodedToken.email}})
    if(associatedType === 1) {
        // is a client, find company
        const company = await Company.findByPk(associatedId, {include: Tag})
        user.dataValues.association = company
        user.dataValues.type = 'client'
        res.status(200).json(user)
    }
    else if (associatedType === 2) {
        // is a professional, find agency
        const agency = await Agency.findByPk(associatedId, {include: Tag})
        user.dataValues.association = agency
        user.dataValues.type = 'agency'
        res.status(200).json(user)
    } else {
        res.status(401).json({message: "Incorrect JWT token"})
    }
})

router.put('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    try {
        const user = await User.findOne({where: {email: decodedToken.email}})
        // only pass name, email, address, phone, profile_picture
        await user.update(req.body)
        if (decodedToken.type === 1) {
            if (req.body.association) {
                const company = await Company.findByPk(decodedToken.associatedId)
                user.dataValues.type = 'company'
                user.dataValues.association = company
                await company.update(req.body.association)
            }
        } else if (decodedToken.type === 2) {
            if (req.body.association) {
                const agency = await Agency.findByPk(decodedToken.associatedId)
                user.dataValues.type = 'agency'
                user.dataValues.association = agency
                await agency.update(req.body.association)
                const tags = req.body.association.tags
                if (tags) {
                    await agency.setTags(tags)
                }
            }
        }

        res.status(200).json({message: 'Successfully updated user', user: user})
    } catch (err) {
        console.log(err)
        res.status(500).json({message: 'Server error'})
    }
})

// verify user
router.get('/verify/:token', async (req, res) => {
    const token = req.params.token
    try {
        const user = await User.findOne({where: {unique_string: token}})
        if (!user) {
            return res.status(401).json({message: 'Invalid token'})
        }
        if (user.is_verified) {
            return res.status(200).json({message: 'User already verified'})
        }
        await user.update({is_verified: true})
        return res.status(200).json({message: 'User verified'})
    } catch (err) {
        console.log(err)
        res.status(500).json({message: 'Server error'})
    }
})

module.exports = router