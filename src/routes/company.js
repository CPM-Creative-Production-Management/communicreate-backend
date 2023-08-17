const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Company, Agency } = require('../models/associations')
const { Payment, Estimation, ReqAgency, Request } = require('../models/associations')

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
    res.json(message)
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
    const today = new Date()
    // calculate due amount for each project
    for (var i = 0; i < paymentJson.length; i++) {
        paymentJson[i].dueAmount = (paymentJson[i].total_amount - paymentJson[i].paid_amount).toFixed(2)
        paymentJson[i].remaining_installments = paymentJson[i].emi_installment_choice - paymentJson[i].installments_completed

        const agency = await Agency.findByPk(paymentJson[i].AgencyId)
        paymentJson[i].agencyName = agency.name

        console.log(today)
        console.log(paymentJson[i].updatedAt)

        const isPaidAfterCreated = Math.floor((paymentJson[i].updatedAt - paymentJson[i].createdAt) / (1000 * 60 * 60 * 24))
        var days = Math.floor((today - paymentJson[i].updatedAt) / (1000 * 60 * 60 * 24))

        if (days >= 0 && days < 30) {
            if (isPaidAfterCreated == 0){
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