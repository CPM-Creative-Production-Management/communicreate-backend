const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Estimation, Task, Employee, ReqAgency } = require('../models/associations')
const { decode } = require('jsonwebtoken')

router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const body = req.body
    const estimation = await Estimation.create({
        is_completed: false,
        is_rejected: false,
        cost: body.cost,
        deadline: body.deadline,
        ReqAgencyId: body.ReqAgencyId
    })
    const tasks = req.body.tasks
    tasks.map(async (taskObject) => {
        const employees = taskObject.employees
        const task = await Task.create({
            name: taskObject.name,
            description: taskObject.description,
            cost: taskObject.cost
        })
        employees.map(async (id) => {
            const employee = await Employee.findByPk(id)
            await task.addEmployee(employee)
        })
        await estimation.addTask(task)
    })
    res.json(estimation)
})


// find estimation by id
router.get('/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const estimation = await Estimation.findByPk(estimationId, {
        include: [{
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            },
            attributes: {
                exclude: ['id', 'accepted', 'finalized',]
            }
        }, {
            model: Task,
            include: Employee
        }]
    })
    res.json(estimation)
})

// get a list of all rejected estimations
router.get('/rejected', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const estimation = await Estimation.findAll({
        include: [{
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            },
            attributes: {
                exclude: ['id', 'accepted', 'finalized',]
            }
        }, {
            model: Task,
            include: Employee
        }],
        where: {
            is_rejected: true
        }
    })
    res.json(estimation)
})

// get a list of ongoing estimations
router.get('/ongoing', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const estimation = await Estimation.findAll({
        include: [{
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            },
            attributes: {
                exclude: ['id', 'accepted', 'finalized',]
            }
        }, {
            model: Task,
            include: {
                model: Employee,
                through: false
            }
        }],
        where: {
            is_rejected: false,
            is_completed: false
        }
    })
    res.json(estimation)
})

router.get('/finished', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const estimation = await Estimation.findAll({
        include: [{
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            },
            attributes: {
                exclude: ['id', 'accepted', 'finalized',]
            }
        }, {
            model: Task,
            include: Employee
        }],
        where: {
            is_rejected: false,
            is_completed: true
        }
    })
    res.json(estimation)
})

// reject an ongoing estimation
router.post('/reject/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const estimation = await Estimation.findByPk(id, {
        include: {
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            }
        },
        where: {
            is_rejected: false,
            is_completed: false
        }
    })
    if (estimation !== null) {
        estimation.is_rejected = true;
        await estimation.save()
    }
    res.json(estimation)
})

// finalize an ongoing estimation
router.post('/finalize/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const estimation = await Estimation.findByPk(id, {
        include: {
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            },
        },
        where: {
            is_accepted: false,
        }
    })
    if (estimation !== null) {
        estimation.is_completed = true;
        await estimation.save()
    }
    res.json(estimation)
})

router.put('/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id;
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const updatedEstimation = req.body
    const estimation = await Estimation.findByPk(estimationId)
    const reqAgency = await estimation.getReqAgency()
    if (estimation === null || reqAgency.AgencyId !== associatedId) {
        res.json({"message": "no such estimation"})
        return
    }

    const update = await Estimation.update(updatedEstimation, {
        where: {
            id: estimationId
        }
    })
    
    res.json(update)
})

router.post('/:id(\\d+)/comment', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const username = decodedToken.username
    const comment = await Comment.create({
        body: req.body.body
    })

})

module.exports = router