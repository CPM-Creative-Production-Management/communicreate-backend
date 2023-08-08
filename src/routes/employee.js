const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Employee, Task } = require('../models/associations')


// retrieve employee by id
router.get('/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
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

    const id = employee.id
    const profile_picture = 'https://cpm-backend.s3.amazonaws.com/profile_pictures/employees/' + id + '.jpg'
    await employee.update({
        profile_picture: profile_picture
    })
    
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(employee, null, 2))
})

router.post('/:id(\\d+)/assign', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const employeeId = req.params.id
    const taskId = req.body.taskId
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    const employee = await Employee.findOne({
        where: {
            id: employeeId,
            AgencyId: associatedId
        }
    })
    if (employee === null) {
        console.log("employee not found")
        return
    }
    const task = await Task.findOne({
        where: {
            id: taskId
        }
    })
    await task.addEmployee(employee)
    const response = await Employee.findOne({
        where: {
            id: employeeId
        }, 
        include: Task
    })
    res.json(response)
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