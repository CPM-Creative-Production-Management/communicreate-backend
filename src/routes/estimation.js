const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Estimation, Task, Employee, ReqAgency, Comment, User, Tag, TaskTag, Company, Agency, Request, Payment } = require('../models/associations')
const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');
const { decode } = require('jsonwebtoken')

router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const body = req.body
    console.log(body)
    try {
        const estimation = await Estimation.create({
            is_completed: false,
            is_rejected: false,
            cost: body.cost,
        })
        const existingEstimation = await Estimation.findOne({
            where: {
                ReqAgencyId: body.ReqAgencyId
            }
        })
        
        // delete existing estimations if any
        let payment
        if (existingEstimation) {
            payment = await existingEstimation.getPayment()
            if (payment)
                await payment.setEstimation(estimation)
            await existingEstimation.destroy()
        }

        const reqAgency = await ReqAgency.findByPk(body.ReqAgencyId)
        await estimation.setReqAgency(reqAgency)
        const tags = body.tags
        tags.map(async (id) => {
            const tag = await Tag.findByPk(id)
            await estimation.addTag(tag)
        })
        const tasks = req.body.tasks
        tasks.map(async (taskObject) => {
            const employees = taskObject.employees
            const taskTags = taskObject.tags
            const task = await Task.create({
                name: taskObject.name,
                description: taskObject.description,
                cost: taskObject.cost
            })
            employees.map(async (id) => {
                const employee = await Employee.findByPk(id)
                await task.addEmployee(employee)
            })

            taskTags.map(async (id) => {
                const tag = await TaskTag.findByPk(id)
                await task.addTaskTag(tag)
            })
            await estimation.addTask(task)
        })
        if (payment) {
            payment.total_cost = body.cost
            await payment.save()
        }
        res.status(200).json(estimation)
    } catch(err) {
        console.log(err)
        res.status(500).json(err)
    }
})

// find estimation by id
router.get('/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId

    let estimation
    if (decodedToken.type === 1) {
        estimation = await Estimation.findByPk(estimationId, {
            include: [{
                model: ReqAgency,
                include: Company,
                where: {
                    CompanyId: associatedId
                },
                attributes: {
                    exclude: ['id', 'accepted', 'finalized',]
                }
            }, {
                model: Task,
                joinTableAttributes: [],
            }, {
                model: Comment,
                include: {
                    model: User,
                    attributes: ['name', 'email'],
                    include: [Agency, Company]
                }
            }]
        })
    } else {
        console.log('here')
        estimation = await Estimation.findByPk(estimationId, {
            include: [{
                model: ReqAgency,
                include: Company,
                where: {
                    AgencyId: associatedId
                },
                attributes: {
                    exclude: ['id', 'accepted', 'finalized',]
                }
            }, {
                model: Task,
                joinTableAttributes: [],
                include: [{
                    model: Employee,
                    joinTableAttributes: [],
    
                }, {
                    model: TaskTag,
                    joinTableAttributes: [],
                }]
            }, {
                model: Comment,
                include: {
                    model: User,
                    attributes: ['name', 'email'],
                    include: [Agency, Company]
                }
            }, {
                model: Tag,
                joinTableAttributes: [],
            }]
        })
    }
    if (estimation === null) {
        return res.status(404).json({message: "not found"})
    }
    const reqAgency = await ReqAgency.findByPk(estimation.ReqAgencyId)
    const request = await reqAgency.getRequest()
    estimation.dataValues.title = request.name
    estimation.dataValues.description = request.description
    res.json(estimation)
})

// find estimation by request id
router.get('/request/:id(\\d+)/agency/:aId(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const requestId = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const agencyId = req.params.aId

    
    const request = await Request.findByPk(requestId, {
        include: {
            model: ReqAgency,
            where: {
                AgencyId: agencyId,
                CompanyId: associatedId
            },
        }
    })

    const reqAgency = request.ReqAgencies[0]
    const e = await Estimation.findOne({
        where: {
            ReqAgencyId: reqAgency.id
        }, include: [{
            model: ReqAgency,
            include: [Agency, Company, Request],
            where: {
                CompanyId: associatedId
            },
        }, {
            model: Task,
            joinTableAttributes: [],
        }, {
            model: Comment,
            include: {
                model: User,
                attributes: ['name', 'email'],
                include: [Agency, Company]
            }
        }]
    })

    let totalCost = 0
    e.Tasks.map(task => {
        totalCost += task.cost
    })

    e.dataValues.extraCost = e.cost - totalCost

    return res.json(e)
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
    // an estimation has many tasks, and those tasks have employees.
    // at first, get the tasks.
    const estimationId = req.params.id
    const basicEstimation = await Estimation.findByPk(estimationId)
    const {Tasks, ReqAgency, ...receivedBasicEstimation} = req.body
    // update the basics of the estimation
    await Estimation.update(receivedBasicEstimation, {
        where: {
            id: estimationId
        }
    })
    
    const estimation = await Estimation.findByPk(estimationId, {
        include: {
            model: Task,
            include: Employee   
        }
    })
    const receivedTasks = req.body.Tasks
    const existingTasks = await estimation.getTasks()
    // delete tasks which are not in receivedTasks
    const idsToDelete = []
    existingTasks.map(async task => {
        if(!receivedTasks.some(rTask => rTask.id === task.id)) {
            idsToDelete.push(task.id)
        }
    })
    await estimation.removeTasks(idsToDelete)
    receivedTasks.map(async task => {
        const taskId = task.id
        const taskExists = await estimation.hasTask(taskId)
        if (!taskExists) {
            // create a task by adding the employees
            const employeeIds = task.employees
            // task.employees contains the employee ids as an array
            // need to add all employees to a nonexisting task
            const newTask = await Task.create({
                name: task.name,
                description: task.description,
                cost: task.cost
            })

            // now add the employees to the task
            employeeIds.map(async employeeId => {
                const newEmployee = await Employee.findByPk(employeeId)
                await newTask.addEmployee(newEmployee)
            })

            // add the task to the estimation
            await estimation.addTask(newTask)
        }
        else {
            // the task already exists, update initial details of the task
            const existingTasks = await estimation.getTasks({where: {id: taskId}})
            const existingTask = existingTasks[0]
            existingTask.name = task.name
            existingTask.description = task.description
            existingTask.cost = task.cost
            await existingTask.save()
            // update employees of that task
            const employeeIds = task.employees
            employeeIds.map(async id => {
                const exists = await existingTask.hasEmployee(id)
                if (!exists) {
                    // employee is not assigned to this task. assign him now
                    const employee = await Employee.findByPk(id)
                    await existingTask.addEmployee(employee)
                }
            })
            const employees = await existingTask.getEmployees()
            employees.map(async employee => {
                if (!employeeIds.includes(employee.id)) {
                    // unassign the employee
                    await existingTask.removeEmployee(employee)
                }
            })
        }
    })
    
    res.json({"message": `updated ${estimationId}`})
})

router.post('/:id(\\d+)/addtask', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id;
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const task = await Task.create(req.body)
    const estimation = await Estimation.findByPk(estimationId, {
        include: {
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            }
        }
    })
    await estimation.addTask(task)
    const updatedEstimation = await Estimation.findByPk(estimationId, {
        include: [{
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            }
        }, {
            model: Task,
            include: Employee
        }]
    })
    res.json(updatedEstimation)
})

router.post('/:id(\\d+)/addtask', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id;
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId
    const task = await Task.create(req.body)
    const estimation = await Estimation.findByPk(estimationId, {
        include: {
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            }
        }
    })
    await estimation.addTask(task)
    const updatedEstimation = await Estimation.findByPk(estimationId, {
        include: [{
            model: ReqAgency,
            where: {
                AgencyId: associatedId
            }
        }, {
            model: Task,
            include: Employee
        }]
    })
    res.json(updatedEstimation)
})

router.post('/:id(\\d+)/comment', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const email = decodedToken.email
    const comment = await Comment.create({
        body: req.body.body
    })
    const user = await User.findOne({
        where: {
            email: email
        }
    })
    const estimation = await Estimation.findByPk(id)
    try {
        await comment.setUser(user)
        await estimation.addComment(comment)
    } catch(err) {
        console.log(err)
    }
    
    res.json({message: 'comment added'})
})

module.exports = router