const express = require('express')
const { Agency } = require('../models/associations')
const { Company } = require('../models/associations')
const { Payment } = require('../models/associations')
const { PaymentHistory } = require('../models/associations')

//for SSLCOMMERZ
const SSLCommerzPayment = require('sslcommerz-lts')
const store_id = 'creat64c622e608a36'
const store_passwd = 'creat64c622e608a36@ssl'
const is_live = false                           //true for live, false for sandbox

const router = express.Router()
const passport = require('passport')

//for payment
const baseurl = 'cpm-backend.onrender.com'
const dues_url = baseurl + '/payment/dues'
const tran_url = baseurl + '/payment/history/'
const ipn_url = 'https://f4bd-103-60-175-70.ngrok-free.app/' //baseurl + '/payment/ipn'
transaction_id = 0
valid_id = 0

router.post('/new', passport.authenticate('jwt', { session: false }), async (req, res) => {
    payment_category = ''
    emi_installment_choice = 0
    if (req.body.emi_option == 0) {
        payment_category = 'FULL'
        emi_installment_choice = 0
    }
    else {
        payment_category = 'EMI'
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
    }).then(function(data){
        res.json({
            responseCode: 1,
            responseMessage: 'Success',
            redirect: dues_url,
            responseData : data
        });
      }).catch(function (err) {
        error = {
            responseCode: 0,
            responseMessage: err.name,
            responseData: {}
        };
        res.json(error)
    });
})

//sslcommerz initialize payment
router.post('/:id(\\d+)/init', passport.authenticate('jwt', { session: false }), async (req, res) => {
    emi_option = 0
    const payment_id = req.params.id
    const payment = await Payment.findByPk(payment_id)
    //console.log(payment)

    const company = await Company.findByPk(payment.CompanyId)
    const company_email = company.email
    const company_phone = company.phone

    if (payment.category == 'EMI') {
        emi_option = 1
    }

    //insert into payment_history table
    const newPaymentHistory = await PaymentHistory.create({
        PaymentId: payment_id,
        transaction_id: req.body.transaction_id,
        amount: req.body.amount,
        status: 'pending'
    }).catch(function (err) {
        error = {
            responseCode: 0,
            responseMessage: err.name,
            responseData: {}
        };
        res.json(error)
    });
    console.log(newPaymentHistory)
    if (newPaymentHistory != undefined) {
        const data = {
            total_amount: req.body.amount,          //SSLCommerz can allow 10.00 BDT to 500000.00 BDT per transaction
            currency: 'BDT',                        //currency = BDT/USD/INR (3 letters fixed)
            tran_id: req.body.transaction_id,                //unique transaction id, Unique ID should be generated from frontend
            success_url: tran_url + payment_id,
            fail_url: tran_url + payment_id,
            cancel_url: tran_url + payment_id,
            ipn_url: ipn_url,       //Instant Payment Notification (IPN) URL of website where SSLCOMMERZ will send the transaction's status
            shipping_method: 'OnlinePayment',                   // not necessary
            product_name: payment.EstimationId,               //estimation_id
            product_category: payment.category,                 //full or emi
            emi_option: emi_option,                    // 0 for full payment, 1 for emi
            emi_max_inst_option: 12,                            // Max installments we allow: 3 / 6 / 9 / 12. We are keeping 12 fixed.
            emi_selected_inst: payment.emi_installment_choice,      // 3 / 6 / 9 / 12
            emi_allow_only: 0,     // Value is always 0. If 1 then only EMI is possible, no Mobile banking and internet banking channel will not display. 
            cus_name: payment.CompanyId,                      // customer name = company id
            cus_email: company_email,                           // customer email = company email
            cus_phone: company_phone,                           // customer phone = company phone
            ship_name: payment.AgencyId,                      // ship name = agency id
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
            //console.log(apiResponse)
            // Redirect the user to payment gateway
            let redirectGatewayURL = apiResponse.redirectGatewayURL
            res.redirect(redirectGatewayURL)
            console.log('Redirecting to: ', redirectGatewayURL)
        });
    }
})

router.get('/:id(\\d+)/history', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const payment = await Payment.findByPk(id)
    const payment_history = await PaymentHistory.findAll({
        where: {
            PaymentId: id
        }
    })
    const data = {
        payment: payment,
        dues: payment.total_amount - payment.paid_amount,
        payment_history: payment_history
    }
    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: data
    }
    res.json(response)
})

//sslcommerz validation 
router.get('/:id(\\d+)/validate', passport.authenticate('jwt', { session: false }), async (req, res) => {
    response = ''
    const data = {
        val_id: req.query.val_id,                // SSLCommerz will send this val_id
        store_id: store_id,
        store_passwd: store_passwd
    };
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    sslcz.validate(data).then(async (response) => {
        //process the response that got from sslcommerz 
        if(response.status == 'VALID'){
            
            // update payment_history table
            const payment_history = await PaymentHistory.update({ status: "successful" },{
                where: {
                    transaction_id: response.tran_id
                },
            });
            const updated_payment_history = await PaymentHistory.findOne(
            { 
                where: 
                { 
                    transaction_id: response.tran_id
                },
            });
            console.log(updated_payment_history)

            // update payment table
            const payment = await Payment.findByPk(updated_payment_history.PaymentId)
            const updated_payment = await Payment.update({
                paid_amount: payment.paid_amount + updated_payment_history.amount,  
                installments_completed: payment.installments_completed + 1
            },{
                where: {
                    id: payment.id
                },
            });
            const updated_payment2 = await Payment.findByPk(payment.id)
            console.log(updated_payment2)
        }
        else if(response.status == 'INVALID_TRANSACTION'){
            console.log('INVALID_TRANSACTION')
        }
        res.json(response)
        // https://developer.sslcommerz.com/doc/v4/#order-validation-api
    });
    
})



module.exports = router