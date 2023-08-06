const express = require('express')
const { Agency } = require('../models/associations')
const { Company } = require('../models/associations')
const { Payment } = require('../models/associations')

//for SSLCOMMERZ
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = 'creat64c622e608a36'
const store_passwd = 'creat64c622e608a36@ssl'
const is_live = false                           //true for live, false for sandbox

const router = express.Router()
const passport = require('passport')

//for payment
const { randomUUID } = require('crypto');       //for transaction id
const baseurl = 'cpm-backend.onrender.com'
const success_url = baseurl + '/dashboard'
const fail_url = baseurl + '/payment'
const cancel_url = baseurl + '/payment'
const ipn_url = baseurl + '/payment/ipn'
transaction_id = 0
valid_id = 0
payment_category = ''
emi_installment_choice = 0

router.post('/new', passport.authenticate('jwt', { session: false }), async (req, res) => {
    if (req.body.emi_option == 0) {
        payment_category = 'full'
        emi_installment_choice = 0
    }
    else {
        payment_category = 'emi'
        emi_installment_choice = req.body.emi_installment_choice
    }
    const newPayment = await Payment.create({
        total_amount: req.body.amount,          //SSLCommerz can allow 10.00 BDT to 500000.00 BDT per transaction
        paid_amount: 0,
        currency: 'BDT',                        //currency = BDT/USD/INR (3 letters fixed)
        category: payment_category,                        //full_payment or half_payment or emi
        emi_installment_choice: emi_installment_choice,  //if total = 12, then total interest will be fixed for 12 months
        installments_completed: 0,
        EstimationId: req.body.estimation_id,                    //estimation_id
        CompanyId: req.body.company_id,                    // customer name = company id
        AgencyId: req.body.agency_id,                      // ship name = agency id
    });
    res.json(newPayment)
})

//sslcommerz initialize payment
router.post('/init', passport.authenticate('jwt', { session: false }), async (req, res) => {
    console.log('API FOUND ')
    const company = await Company.findByPk(req.body.company_id)
    const company_email = company.email
    const company_phone = company.phone
    if (req.body.emi_option == 0) {
        payment_category = 'full'
    } else {
        payment_category = 'emi'
    }
    const data = {
        total_amount: req.body.amount,          //SSLCommerz can allow 10.00 BDT to 500000.00 BDT per transaction
        currency: 'BDT',                        //currency = BDT/USD/INR (3 letters fixed)
        tran_id: req.body.transaction_id,                //unique transaction id, Unique ID should be generated from frontend
        success_url: success_url,
        fail_url: fail_url,
        cancel_url: cancel_url,
        ipn_url: ipn_url,       //Instant Payment Notification (IPN) URL of website where SSLCOMMERZ will send the transaction's status
        shipping_method: 'OnlinePayment',                   // not necessary
        product_name: req.body.estimation_id,               //estimation_id
        product_category: payment_category,                 //full or emi
        emi_option: req.body.emi_option,                    // 0 for full payment, 1 for emi
        emi_max_inst_option: 12,                            // Max installments we allow: 3 / 6 / 9 / 12. We are keeping 12 fixed.
        emi_selected_inst: req.body.emi_installment_choice,      // 3 / 6 / 9 / 12
        emi_allow_only: 0,     // Value is always 0. If 1 then only EMI is possible, no Mobile banking and internet banking channel will not display. 
        cus_name: req.body.company_id,                      // customer name = company id
        cus_email: company_email,                           // customer email = company email
        cus_phone: company_phone,                           // customer phone = company phone
        ship_name: req.body.agency_id,                      // ship name = agency id
        product_profile: 'Creative Content',                // not necessary
        cus_add1: 'Dhaka',                                  // not necessary
        cus_add2: 'Dhaka',                                  // not necessary
        cus_city: 'Dhaka',                                  // not necessary
        cus_state: 'Dhaka',                                 // not necessary
        cus_postcode: 1000,                                 // not necessary
        cus_country: 'Bangladesh',                          // not necessary
        cus_fax: 'XXXXXXXXXXX',                             // not necessary
        ship_add1: 'Dhaka',                                 // not necessary
        ship_add2: 'Dhaka',                                 // not necessary
        ship_city: 'Dhaka',                                 // not necessary
        ship_state: 'Dhaka',                                // not necessary
        ship_postcode: 1000,                                // not necessary
        ship_country: 'Bangladesh',                         // not necessary
    };
    const sslcz = new SSLCommerzPayment(
        store_id,
        store_passwd,
        is_live)
    sslcz.init(data).then(apiResponse => {
        console.log(apiResponse)
        // Redirect the user to payment gateway
        let redirectGatewayURL = apiResponse.redirectGatewayURL
        res.redirect(redirectGatewayURL)
        console.log('Redirecting to: ', redirectGatewayURL)
    });
})

//sslcommerz validation 
router.get('/validate', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const data = {
        val_id: res.val_id
    };
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    sslcz.validate(data).then(data => {
        //process the response that got from sslcommerz 
        // https://developer.sslcommerz.com/doc/v4/#order-validation-api
    });
})

router.post('/success', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const updatedRows = await Payment.update(
        {
            status: "successful",
        },
        {
            where: { id: req.body.payment_id },
        }
    );
    console.log(updatedRows);
})

router.post('/fail', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const updatedRows = await Payment.update(
        {
            status: "failed",
        },
        {
            where: { id: req.body.payment_id },
        }
    );
    console.log(updatedRows);
})


module.exports = router