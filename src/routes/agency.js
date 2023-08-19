const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Company, Tag, Payment, PaymentHistory, Estimation, ReqAgency, Request } = require('../models/associations')

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
    res.status(200).json({message: 'success'})
})

// post new agency
router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const agency = await Agency.create(req.body)
    res.json(agency)
})

// edit new agency
router.put('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
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
        where : {
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
    const today = new Date()
    // calculate due amount for each project
    for (var i = 0; i < paymentJson.length; i++) {
        paymentJson[i].dueAmount = (paymentJson[i].total_amount - paymentJson[i].paid_amount).toFixed(2)
        paymentJson[i].remaining_installments = paymentJson[i].emi_installment_choice - paymentJson[i].installments_completed

        const company = await Company.findByPk(paymentJson[i].CompanyId)
        paymentJson[i].companyName = company.name

        console.log(today)
        console.log(paymentJson[i].updatedAt)

        var days = Math.floor((today - paymentJson[i].updatedAt) / (1000 * 60 * 60 * 24))
        console.log('days: ', days)

        if (days >= 0 && days < 30) {
            if (paymentJson[i].paid_amount == 0) {
                paymentJson[i].overdue = 1
                paymentJson[i].message = days + " days overdue"
            } else if(paymentJson[i].dueAmount == 0){
                paymentJson[i].overdue = 2
                paymentJson[i].message = "Full Payment Done"
            }
            else{
                paymentJson[i].overdue = 0
                paymentJson[i].message = "Dues cleared for this month"
            }
        } else {
            const months = Math.floor(days / 30)
            paymentJson[i].overdue = 1
            paymentJson[i].message = months + " months overdue"
        }


        const estimation = await Estimation.findByPk(paymentJson[i].EstimationId)
        const reqAgency = await ReqAgency.findByPk(estimation.ReqAgencyId)
        const request = await Request.findByPk(reqAgency.RequestId)
        paymentJson[i].projectName = request.name
    }

    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: paymentJson
    }
    res.json(response)
})

module.exports = router