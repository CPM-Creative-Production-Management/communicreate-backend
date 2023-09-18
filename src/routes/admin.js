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
    const user = await User.findOne({ where: { email: email }, attributes: { exclude: ['password'] } })
    if (!user.is_verified) {
        return res.status(401).json({ message: 'User not verified' })
    }
    if (user.type === 3 && user.associatedId === 0) {
        // Send the JWT to the user
        return res.json({ token, user });
    } else {
        console.log("Not an admin", user.type)
    }
});

router.get('/logout', function (req, res, next) {
    res.json({ message: 'Successfully logged out' })
});

router.get('/dashboard', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    const decodedToken = decodeToken(req)
    const unverifiedUsers = await User.findAll({ where: { is_verified: false }, attributes: { exclude: ['password'] } })
    var unverifiedUsersJson = unverifiedUsers.map(user => user.toJSON())
    for(var i = 0; i < unverifiedUsersJson.length; i++) {
        if(unverifiedUsersJson[i].type === 1) {
            const company = await Company.findByPk(unverifiedUsersJson[i].associatedId)
            unverifiedUsersJson[i].company = company
            unverifiedUsersJson[i].association = company
        } else if(unverifiedUsersJson[i].type === 2) {
            const agency = await Agency.findByPk(unverifiedUsersJson[i].associatedId)
            unverifiedUsersJson[i].agency = agency
            unverifiedUsersJson[i].association = agency
        }
    }
    res.status(200).json({ unverifiedUsers: unverifiedUsersJson })
})

router.put('/verifyUser/:id(\\d+)', async (req, res, next) => {
    const id = req.params.id
    try {
        const user = await User.findByPk(id)
        await user.update({
            is_verified: true
        })
        res.status(200).json({ message: 'Successfully updated user', user: user })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server error' })
    }
})

router.post('/rejectUser/:id(\\d+)', async (req, res, next) => {
    const id = req.params.id
    try {
        await User.destroy({ where: { id: id } })
        res.status(200).json({ message: 'Successfully deleted user'})
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server error' })
    }
})

module.exports = router