const express = require('express')
const { Agency } = require('../models/associations')
const { Company } = require('../models/associations')
const { Payment } = require('../models/associations')
const { PaymentHistory } = require('../models/associations')

const router = express.Router()
const passport = require('passport')

router.get('/', async (req, res) => {
    const paymentHistory = await PaymentHistory.findAll()
    res.json(paymentHistory)
})

module.exports = router