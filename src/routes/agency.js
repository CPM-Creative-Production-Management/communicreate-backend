const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Company, Tag, Payment, PaymentHistory, Estimation, ReqAgency, Request, Review, User, Task } = require('../models/associations')

router.get('/', async (req, res) => {
    const agencies = await Agency.findAll({
        include: Tag
    })
    agencies.forEach(agency => {
        agency.dataValues.key = agency.name
        agency.dataValues.value = agency.id
        agency.dataValues.text = agency.name
        agency.dataValues.details = agency.dataValues.description
        // remove description from dataValues
        delete agency.dataValues.description
    })
    res.json(agencies)
})

// get agency by id
router.get('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const agency = await Agency.findByPk(id)
    res.json(agency)
})

// get complete details of an agency
router.get('/:id(\\d+)/details', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const agency = await Agency.findByPk(id, {
        include: [
            {
                model: Tag
            },
            {
                model: ReqAgency,
                include: [{
                    model: Estimation,
                    // where: {
                    //     is_completed: true
                    // }
                }, {
                    model: Review,
                }, {
                    model: Company
                }]
            }
        ]
    })

    // add the company from reqAgency to review
    agency.ReqAgencies.forEach(reqAgency => {
        if (reqAgency.Review) {
            reqAgency.Review.dataValues.Company = reqAgency.Company
        }
    })

    const rawReviews = agency.ReqAgencies.map(reqAgency => {
        if (reqAgency.Review) {
            return reqAgency.Review
        }
    })

    // remove null values from reviews
    const reviews = rawReviews.filter(review => review != null)
    agency.dataValues.Reviews = reviews
    agency.dataValues.Reviews = agency.dataValues.Reviews.slice(0, 3)

    delete agency.dataValues.ReqAgencies

    // collect company details
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    const company = await Company.findByPk(associatedId)

    const reqAgencies = await ReqAgency.findAll({
        where: {
            AgencyId: id,
            CompanyId: associatedId,
            accepted: true,
            finalized: true
        },
        include: [{
            model: Estimation,
        }, {
            model: Request
        }, {
            model: Company
        }, {
            model: Review
        }]
    })

    agency.dataValues.ReqAgencies = reqAgencies
    agency.dataValues.ReqAgencies = agency.dataValues.ReqAgencies.sort((a, b) => b.id - a.id)
    agency.dataValues.ReqAgencies = agency.dataValues.ReqAgencies.slice(0, 3)

    res.json(agency)
})

router.put('/:id(\\d+)/settags', async (req, res) => {
    const id = req.params.id
    const tags = req.body.tags
    const agency = await Agency.findByPk(id)
    await agency.setTags([])
    for (let i = 0; i < tags.length; i++) {
        const id = tags[i];
        const tag = await Tag.findByPk(id)
        await agency.addTag(tag)
    }
    res.status(200).json({ message: 'success' })
})

// post new agency
router.post('/', async (req, res) => {
    const agency = await Agency.create(req.body)
    res.json(agency)
})

// edit new agency
router.put('/:id(\\d+)', async (req, res) => {
    const id = req.params.id
    const body = req.body
    const update = await Agency.update(body, {
        where: {
            id: id
        }
    })
    const updatedAgency = await Agency.findByPk(id)
    res.json(updatedAgency)
})

// delete agency
router.delete('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const message = await Agency.destroy({
        where: {
            id: id
        }
    })
    res.json(message)
})

// get all dues of an agency
router.get('/dues', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    // console.log(associatedId)

    const payments = await Payment.findAll({
        where: {
            AgencyId: associatedId
        }
    })
    var paymentJson = payments.map(payment => payment.toJSON());
    // console.log(paymentJson)

    // calculate due amount for each project
    for (var i = 0; i < paymentJson.length; i++) {
        paymentJson[i].total_amount = paymentJson[i].total_amount.toFixed(2)
        paymentJson[i].paid_amount = paymentJson[i].paid_amount.toFixed(2)
        paymentJson[i].due_amount = (paymentJson[i].total_amount - paymentJson[i].paid_amount).toFixed(2)

        const company = await Company.findByPk(paymentJson[i].CompanyId)
        paymentJson[i].companyName = company.name

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
                paymentJson[i].message = "Tasks incomplete. Dues pending."
            }
            else if (unpaid_completed_tasks.length > 0) {
                paymentJson[i].overdue = 1
                paymentJson[i].message = "Payment Due for Completed Tasks."
            }
        }
        else if (paymentJson[i].due_amount == 0) {
            if (paid_incomplete_tasks.length > 0) {
                paymentJson[i].overdue = 2
                paymentJson[i].message = "Tasks incomplete. But dues cleared."
            }
            else if (paid_completed_tasks.length > 0) {
                paymentJson[i].overdue = 3
                paymentJson[i].message = "Full Payment Done."
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
        console.log(paymentJson[i].id)
        paymentJson[i].projectName = project.Estimation.ReqAgency.Request.name;
    }

    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: paymentJson
    }
    res.json(response)
})

// get all reviews of an agency
router.get('/:id(\\d+)/review', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const agencyId = req.params.id
    const reviews = await Review.findAll({
        include: {
            model: ReqAgency,
            where: {
                AgencyId: agencyId
            }
        }
    })
    res.json(reviews)
})

module.exports = router