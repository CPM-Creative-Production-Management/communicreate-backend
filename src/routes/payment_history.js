const express = require('express')
const { Agency } = require('../models/associations')
const { Company } = require('../models/associations')
const { PaymentHistory } = require('../models/associations')

const router = express.Router()
const passport = require('passport')

router.get('/', async (req, res) => {
    const paymentHistory = await PaymentHistory.findAll()
    res.json(paymentHistory)
})

router.post('/:id(\\d+)/new', passport.authenticate('jwt', { session: false }), async (req, res) => {
    if(req.body.emi_option == 0){
        payment_category = 'full'
    } else{
        payment_category = 'emi'
    }
    const newTransaction = await PaymentHistory.create({
        PaymentId: req.params.id,
        transaction_id: req.body.transaction_id,               //unique transaction id will be different for each installment
        amount: req.body.amount,          //SSLCommerz can allow 10.00 BDT to 500000.00 BDT per transaction
        currency: 'BDT',                        //currency = BDT/USD/INR (3 letters fixed)
        category: payment_category,                        //full_payment or half_payment or emi
        emi_installment_choice: req.body.emi_installment_choice,  //if total = 12, then total interest will be fixed for 12 months
        installments_completed: 0,
        status: 'pending',                       //pending, success, fail
        payment_date: new Date()
    });
    res.json(newTransaction)
})

module.exports = router