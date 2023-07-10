const express = require('express')
const router = express.Router()
const passport = require('passport')
const jwt = require('jsonwebtoken')
const { createUser } = require('../utils/helper')

router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
    // Successful authentication
  
    // Create a JWT payload
    const payload = {
        username: req.user.get('username'),
        type: req.user.get('type'),
        associatedId: req.user.get('associatedId')
    };

    // Generate a JWT with a secret key
    const token = jwt.sign(payload, 'catto');
  
    // Send the JWT to the user
    res.json({ token });
  });

  router.get('/logout', function(req, res, next) {
    res.json({message: 'Successfully logged out'})
});

router.post('/signup', (req, res, next) => {
    const username = req.body.username
    const password = req.body.password
    const type = req.body.type
    const associatedId = req.body.associatedId
    if(createUser(username, password, type, associatedId)) {
        return res.status(200).json({
            message: 'User successfully created'
        })
    } else {
        return res.status(401).json({
            message: 'User creation unsuccessful'
        })
    }
    
})

module.exports = router