const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Company, Agency } = require('../models/associations')
const { Payment } = require('../models/associations')

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
router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
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
        where : {
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
    for(var i = 0; i < paymentJson.length; i++){
        paymentJson[i].dueAmount = paymentJson[i].total_amount - paymentJson[i].paid_amount
        paymentJson[i].remaining_installments = paymentJson[i].emi_installment_choice - paymentJson[i].installments_completed

        const agency = await Agency.findByPk(paymentJson[i].AgencyId)
        paymentJson[i].agencyName = agency.name

        console.log(today)
        console.log(paymentJson[i].updatedAt)
        var days = Math.floor((today - paymentJson[i].updatedAt) / (1000 * 60 * 60 * 24))
        if(days > 30){
            days = days - 30
            paymentJson[i].days = days + " days overdue"
        } else {    
            days = 30 - days
            paymentJson[i].days = "Next payment due in " + Math.abs(days) + " days"
        }
    }

    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: paymentJson
    }
    res.json(response)
})

module.exports = router