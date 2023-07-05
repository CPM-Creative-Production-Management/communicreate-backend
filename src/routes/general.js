const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency } = require('../models/associations')

// route to get a list of all employees of an agency by an agency owner
router.get('/employees', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    const agency = await Agency.findByPk(associatedId)
    const employeeList = await agency.getEmployees()
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(employeeList, null, 2))
})

module.exports = router