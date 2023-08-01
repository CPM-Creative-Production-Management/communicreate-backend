const express = require('express')

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
const success_url = baseurl+'/payment/success'
const fail_url = baseurl+'/payment/fail'
const cancel_url = baseurl+'/payment/cancel'
const ipn_url = baseurl+'/payment/ipn'

//sslcommerz initialize payment
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    console.log('API FOUND ')
    const data = {
        total_amount: req.body.amount,
        currency: req.body.currency,
        tran_id: req.body.transaction_id,          // create a random unique transaction id for each api call
        success_url: success_url,
        fail_url: fail_url,
        cancel_url: cancel_url,
        ipn_url: ipn_url,       //Instant Payment Notification (IPN) URL of website where SSLCOMMERZ will send the transaction's status
        shipping_method: req.body.payment_method,           // bank or visa_card or bkash or nagad
        product_name: req.body.project_name,                //project name
        product_category: req.body.payment_category,        //full_payment or half_payment or emi
        cus_name: req.body.company_id,                      // customer name = company id
        cus_email: req.body.company_email,                  // customer email = company email
        cus_phone: req.body.company_phone,                  // customer phone = company phone
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
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.redirect(GatewayPageURL)
        console.log('Redirecting to: ', GatewayPageURL)
    });
})

// payment response and save data 


module.exports = router