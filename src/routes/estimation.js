const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Estimation, Task, Employee, ReqAgency, Comment, User, Tag, TaskTag, Company, Agency, Request, Payment } = require('../models/associations')
const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');
const { decode } = require('jsonwebtoken')
const { getCommentsRecursive } = require('../utils/helper')

router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const body = req.body
    console.log(body)
    try {
        const estimation = await Estimation.create({
            is_completed: false,
            is_rejected: false,
            cost: body.cost,
        })
        const existingEstimations = await Estimation.findAll({
            where: {
                ReqAgencyId: body.ReqAgencyId
            }
        })
        
        // delete existing estimations if any
        let payment
        let updatedPayment = false
        for (let i = 0; i < existingEstimations.length; i++) {
            const existingEstimation = existingEstimations[i]
            payment = await existingEstimation.getPayment()
            if (payment && !updatedPayment) {
                updatedPayment = true
                await payment.setEstimation(estimation)
            }
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
        for (let i = 0; i < tasks.length; i++) {
            const taskObject = tasks[i]
            const employees = taskObject.employees
            const taskTags = taskObject.tags
            const task = await Task.create({
                name: taskObject.name,
                description: taskObject.description,
                cost: taskObject.cost
            })
            for (let j = 0; j < employees.length; j++) {
                const employeeId = employees[j]
                const employee = await Employee.findByPk(employeeId)
                await task.addEmployee(employee)
            }
            for (let j = 0; j < taskTags.length; j++) {
                const taskTagId = taskTags[j]
                const taskTag = await TaskTag.findByPk(taskTagId)
                await task.addTaskTag(taskTag)
            }
            await estimation.addTask(task)
        }
        if (payment) {
            payment.total_cost = body.cost
            await payment.save()
        }
        res.status(200).json({message: "estimation created successfully"})
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
            include: [Agency, Company, Request, Estimation],
            where: {
                CompanyId: associatedId
            },
        }, {
            model: Task,
            joinTableAttributes: [],
        }, {
            model: Payment
        }]
    })

    console.log(e.id)

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
    const {tasks, tags, ...receivedBasicEstimation} = req.body
    // update the basics of the estimation
    await Estimation.update(receivedBasicEstimation, {
        where: {
            id: estimationId
        }
    })

    // update tags
    const existingTags = await basicEstimation.getTags()
    const receivedTags = tags
    const tagsToDelete = []
    existingTags.map(async tag => {
        if(!receivedTags.some(rTag => rTag === tag.id)) {
            tagsToDelete.push(tag.id)
        }
    })
    await basicEstimation.removeTags(tagsToDelete)
    for (let i = 0; i < receivedTags.length; i++) {
        const tagId = receivedTags[i]
        const tagExists = await basicEstimation.hasTag(tagId)
        if (!tagExists) {
            const newTag = await Tag.findByPk(tagId)
            await basicEstimation.addTag(newTag)
        }
    }
    
    const estimation = await Estimation.findByPk(estimationId, {
        include: {
            model: Task,
            include: Employee   
        }
    })

    const receivedTasks = tasks
    const existingTasks = await estimation.getTasks()
    // delete tasks which are not in receivedTasks
    const idsToDelete = []
    existingTasks.map(async task => {
        if(!receivedTasks.some(rTask => rTask.id === task.id)) {
            idsToDelete.push(task.id)
        }
    })
    await estimation.removeTasks(idsToDelete)
    for (let i = 0; i < receivedTasks.length; i++) {
        const task = receivedTasks[i]
        const taskId = task.id
        const taskExists = await estimation.hasTask(taskId)
        if (!taskExists) {
            // create a task by adding the employees
            const employeeIds = task.employees
            const taskTags = task.tags
            // task.employees contains the employee ids as an array
            // need to add all employees to a nonexisting task
            const newTask = await Task.create({
                name: task.name,
                description: task.description,
                cost: task.cost
            })

            for (let i = 0; i < taskTags.length; i++) {
                const taskTagId = taskTags[i]
                const taskTag = await TaskTag.findByPk(taskTagId)
                await newTask.addTaskTag(taskTag)
            }

            // now add the employees to the task
            for (let i = 0; i < employeeIds.length; i++) {
                const employeeId = employeeIds[i]
                const employee = await Employee.findByPk(employeeId)
                await newTask.addEmployee(employee)
            }
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
            for (let i = 0; i < employeeIds.length; i++) {
                const employeeId = employeeIds[i]
                const exists = await existingTask.hasEmployee(employeeId)
                if (!exists) {
                    // employee is not assigned to this task. assign him now
                    const employee = await Employee.findByPk(employeeId)
                    await existingTask.addEmployee(employee)
                }
            }
            const employees = await existingTask.getEmployees()
            for (let i = 0; i < employees.length; i++) {
                const employee = employees[i]
                const employeeId = employee.id
                const exists = employeeIds.includes(employeeId)
                if (!exists) {
                    // employee is assigned to this task, but not in the received task. unassign him now
                    await existingTask.removeEmployee(employee)
                }
            }

            
            // update task tags
            const taskTags = task.tags
            // remove all task tags
            const existingTaskTags = await existingTask.getTaskTags()
            await existingTask.removeTaskTags(existingTaskTags)
            // add all task tags
            for (let i = 0; i < taskTags.length; i++) {
                const taskTagId = taskTags[i]
                const taskTag = await TaskTag.findByPk(taskTagId)
                await existingTask.addTaskTag(taskTag)
            }
        }
    }
    
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

// for a particular request, for a particular agency
// post a comment
router.post('/:id(\\d+)/comment', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id
    const decodedToken = decodeToken(req)
    const body = req.body.body
    try {
        const estimation = await Estimation.findByPk(estimationId)
        const reqAgency = await estimation.getReqAgency()

        if (reqAgency === null) {
            res.status(404).json({message: "request not found"})
            return
        }

        const user = await User.findOne({
            where: {
                email: decodedToken.email
            }
        })

        const comment = await Comment.create({
            body: body
        })

        await comment.setUser(user)
        await comment.setReqAgency(reqAgency)

        res.status(200).json({message: "comment posted successfully"})
        
    } catch (err) {
        console.log(err)
        res.status(500).json({message: "server error"})
    }
})

// for a particular estimation
// get all comments
router.get('/:id(\\d+)/comment', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const estimationId = req.params.id
    const decodedToken = decodeToken(req)
    try {
        const estimation = await Estimation.findByPk(estimationId)
        const reqAgency = await estimation.getReqAgency()

        if (reqAgency === null) {
            res.status(404).json({message: "request not found"})
            return
        }

        const comments = await Comment.findAll({
            where: {
                ReqAgencyId: reqAgency.id,
                level: 0
            },
            include: {
                model: User,
                attributes: { exclude: ['password', 'username', 'id']},
            },
            // sort by createdAt
            order: [['createdAt', 'ASC']]
        })

        for (let i = 0; i < comments.length; i++) {
            const comment = comments[i]
            await getCommentsRecursive(comment)
        }

        res.status(200).json(comments)

    } catch (err) {
        console.log(err)
        res.status(500).json({message: "server error"})
    }
})

router.put('/task/request/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    try {
        const task = await Task.findByPk(id)
        if (task === null) {
            res.status(404).json({message: "task not found"})
            return
        }

        if (task.status === 1 || task.status === 2) {
            res.status(400).json({message: "task not applicable for requesting approval"})
            return
        }

        task.status = 1
        await task.save()
        return res.status(200).json({message: "task status updated successfully"})
    } catch (err) {
        console.log(err)
    }
})

router.put('/task/approve/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    try {
        const task = await Task.findByPk(id)
        if (task === null) {
            res.status(404).json({message: "task not found"})
            return
        }

        if (task.status === 0 || task.status === 2) {
            res.status(400).json({message: "task not applicable for approval"})
            return
        }

        task.status = 2
        await task.save()
        return res.status(200).json({message: "task status updated successfully"})
    } catch (err) {
        console.log(err)
    }
})

router.put('/task/review/:id(\\d+)', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    try {
        const task = await Task.findByPk(id)
        if (task === null) {
            res.status(404).json({message: "task not found"})
            return
        }

        if (task.status === 0) {
            res.status(400).json({message: "task not applicable for reviewing"})
            return
        }

        task.status = 0
        await task.save()
        return res.status(200).json({message: "task status updated successfully"})
    } catch (err) {
        console.log(err)
    }
})

module.exports = router