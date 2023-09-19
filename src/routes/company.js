const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Company, Agency } = require('../models/associations')
const { Payment, Estimation, ReqAgency, Request, Task } = require('../models/associations')

// get Company by id
router.get('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const company = await Company.findByPk(id)
    res.json(company)
})

router.get('/', async (req, res) => {
    const companies = await Company.findAll()
    companies.forEach(company => {
        company.dataValues.key = company.name
        company.dataValues.value = company.id
        company.dataValues.text = company.name
        company.dataValues.details = company.dataValues.description
        // remove description from dataValues
        delete company.dataValues.description
    })
    res.json(companies)
})

// post new Company
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const company = await Company.create(req.body)
    res.json(company)
})

// edit new Company
router.put('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const body = req.body
    const updatedCompany = await Company.update(body, {
        where: {
            id: id
        }
    })
    const update = await Company.findByPk(id)
    res.json(update)
})

// delete Company
router.delete('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const message = await Company.destroy({
        where: {
            id: id
        }
    })
    res.status(200).json(message)
})

// get all dues of a company
router.get('/dues', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    // console.log(associatedId)

    const payments = await Payment.findAll({
        where: {
            CompanyId: associatedId
        }
    })
    var paymentJson = payments.map(payment => payment.toJSON());
    // console.log(paymentJson)

    // calculate due amount for each project
    for (var i = 0; i < paymentJson.length; i++) {
        paymentJson[i].total_amount = paymentJson[i].total_amount.toFixed(2)
        paymentJson[i].paid_amount = paymentJson[i].paid_amount.toFixed(2)
        paymentJson[i].due_amount = (paymentJson[i].total_amount - paymentJson[i].paid_amount).toFixed(2)

        const agency = await Agency.findByPk(paymentJson[i].AgencyId)
        paymentJson[i].agencyName = agency.name

        const tasks = await Task.findAll({
            where: {
                EstimationId: paymentJson[i].EstimationId
            }
        })
        paymentJson[i].tasks = tasks
        const unpaid_completed_tasks = tasks.filter(task => (task.status === 2 && task.isPaid === 0));
        const unpaid_incomplete_tasks = tasks.filter(task => (task.status !== 2 && task.isPaid === 0));
        const paid_completed_tasks = tasks.filter(task => (task.status === 2 && task.isPaid === 1));
        const paid_incomplete_tasks = tasks.filter(task => (task.status !== 2 && task.isPaid === 1));

        if (paymentJson[i].due_amount > 0) {
            if (unpaid_incomplete_tasks.length > 0) {
                paymentJson[i].overdue = 0
                paymentJson[i].message = "Dues can be cleared later"
            }
            else if (unpaid_completed_tasks.length > 0) {
                paymentJson[i].overdue = 1
                paymentJson[i].message = "Payment overdue for completed tasks"
            }
        }
        else if (paymentJson[i].due_amount == 0) {
            if (paid_incomplete_tasks.length > 0) {
                paymentJson[i].overdue = 2
                paymentJson[i].message = "Dues already cleared, but tasks are incomplete "
            }
            else if (paid_completed_tasks.length > 0) {
                paymentJson[i].overdue = 3
                paymentJson[i].message = "Full Payment Done"
            }
        }

        const project = await Payment.findByPk(paymentJson[i].id, {
            include: [
                {
                    model: Estimation,
                    include: [
                        {
                            model: ReqAgency,
                            include: [
                                {
                                    model: Request,
                                    attributes: ['name'],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        paymentJson[i].projectName = project.Estimation.ReqAgency.Request.name;
    }

    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: paymentJson
    }
    res.json(response)
})

module.exports = router