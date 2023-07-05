const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Employee } = require('../models/associations')


// retrieve employee by id
router.get('/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    const employeeId = req.params.id
    const employee = await Employee.findOne({
        where: {
            id: employeeId,
            AgencyId: associatedId
        }
    })
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(employee, null, 2))
})

router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;

    // get employee params from body
    const name = req.body.name
    const dob = req.body.dob
    const address = req.body.address
    const rating = req.body.rating
    const salary = req.body.salary
    
    const employee = await Employee.create({
        name: name,
        dob: dob,
        address: address,
        rating: rating,
        salary: salary,
        AgencyId: associatedId
    })
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(employee, null, 2))
})

router.put('/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    const employeeId = req.params.id
    const updatedFields = req.body
    
    const employee = await Employee.findOne({
        where: {
            id: employeeId,
            AgencyId: associatedId
        }
    })

    if (updatedFields.hasOwnProperty('AgencyId')) {
        res.status(500)
        res.json('Request cannot contain AgencyId as parameter')
    }

    if (employee == null) {
        res.send('Unauthorized')
        return
    }

    Object.assign(employee, updatedFields)

    await employee.save()

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(employee, null, 2))
})

router.delete('/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    const employeeId = req.params.id
    try {
        await Employee.destroy({
            where: {
                AgencyId: associatedId,
                id: employeeId
            }
        })
        const message = { message: `Deleted user ${employeeId} successfully`}
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(message, null, 2))
    } catch(err) {
        res.send(err)
    }
})



module.exports = router