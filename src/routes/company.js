const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Company } = require('../models/associations')
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
router.get('/:id(\\d+)/dues', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const payments = await Payment.findAll({
        where: {
            CompanyId: req.params.id
        }
    })
    var paymentJson = payments.map(payment => payment.toJSON());
    console.log(paymentJson)

    // calculate due amount for each project
    for(var i = 0; i < paymentJson.length; i++){
        paymentJson[i].dueAmount = paymentJson[i].total_amount - paymentJson[i].paid_amount
        paymentJson[i].remaining_installments = paymentJson[i].emi_installment_choice - paymentJson[i].installments_completed
    }

    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: paymentJson
    }
    res.json(response)
})

module.exports = router