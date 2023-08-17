const express = require('express')
const crypto = require("crypto");
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
require('dotenv').config({ path: '../../.env' });
const { Agency } = require('../models/associations')
const { Company } = require('../models/associations')
const { Payment, Estimation, ReqAgency, Request } = require('../models/associations')
const { PaymentHistory } = require('../models/associations')
const bodyParser = require('body-parser').json()

//for SSLCOMMERZ
const SSLCommerzPayment = require('sslcommerz').SslCommerzPayment
const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASSWORD
const is_live = false                           //true for live, false for sandbox

//for payment
const baseurl = process.env.BACKEND_URL
const success_url = baseurl + 'payment/success'
const fail_url = baseurl + 'payment/failure'

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
    }).then(function (data) {
        res.json({
            responseCode: 1,
            responseMessage: 'Success',
            redirect: baseurl + 'payment/' + data.id,
            responseData: data
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
    const transaction_id = crypto.randomUUID({ disableEntropyCache: true })
    emi_option = 0
    const payment_id = req.params.id
    const payment = await Payment.findByPk(payment_id)
    //console.log(payment)

    const company = await Company.findByPk(payment.CompanyId)
    const company_email = company.email
    const company_phone = company.phone

    var amount = payment.total_amount;
    if (payment.category == 'EMI') {
        emi_option = 1
        if (payment.installments_completed < payment.emi_installment_choice) {
            var amount = ((payment.total_amount - payment.paid_amount) / (payment.emi_installment_choice - payment.installments_completed)).toFixed(2)
        }
    }

    //insert into payment_history table
    const newPaymentHistory = await PaymentHistory.create({
        PaymentId: payment_id,
        transaction_id: transaction_id,
        amount: amount,
        status: 'pending'
    }).catch(function (err) {
        const error = {
            responseCode: 0,
            responseMessage: err.name,
            responseData: {}
        };
        res.json(error)
    });
    //console.log(newPaymentHistory)
    if (true) {
        //console.log('Payment History Inserted')
        const data = {
            total_amount: amount,          //SSLCommerz can allow 10.00 BDT to 500000.00 BDT per transaction
            currency: 'BDT',                        //currency = BDT/USD/INR (3 letters fixed)
            tran_id: transaction_id,                //unique transaction id
            success_url: success_url,
            fail_url: fail_url,
            cancel_url: success_url,
            ipn_url: success_url,       //Instant Payment Notification (IPN) URL of website where SSLCOMMERZ will send the transaction's status
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
            let GatewayPageURL = apiResponse.GatewayPageURL
            console.log('Redirecting to: ', GatewayPageURL)
            res.status(200).json(GatewayPageURL)
        });
    }
})

router.get('/:id(\\d+)/history', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const payment = await Payment.findByPk(id)
    var paymentJson = payment.toJSON();

    const payment_history = await PaymentHistory.findAll({
        where: {
            PaymentId: id,
            status: ['successful', 'failed']
        },
        order: [['updatedAt', 'ASC']]
    })
    var paymentHistoryJson = payment_history.map(p => p.toJSON());

    const estimation = await Estimation.findByPk(paymentJson.EstimationId)
    const reqAgency = await ReqAgency.findByPk(estimation.ReqAgencyId)
    const request = await Request.findByPk(reqAgency.RequestId)
    paymentJson.projectName = request.name

    for (var i = 0; i < paymentHistoryJson.length; i++) {
        const date = { day: '2-digit', month: 'long', year: 'numeric' };
        paymentHistoryJson[i].payment_date = paymentHistoryJson[i].updatedAt.toLocaleDateString('en-US', date);

        const time = { hour12: true, hour: 'numeric', minute: 'numeric', second: 'numeric' };
        paymentHistoryJson[i].payment_time = paymentHistoryJson[i].updatedAt.toLocaleTimeString('en-US', time);
    }

    const data = {
        payment: paymentJson,
        dues: payment.total_amount - payment.paid_amount,
        payment_history: paymentHistoryJson
    }

    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: data
    }
    res.json(response)
})


//sslcommerz success
router.post('/success', async (req, res) => {
    const data = req.body;
    console.log('Here for data ', data)
    let responseData = {}

    const ssl = new SSLCommerzPayment(store_id, store_passwd, is_live)
    const validation = ssl.validate(data);
    validation.then(async response => {
        // console.log('Validation checking:');
        // console.log('response:')
        // console.log(response);
        //process the response that got from sslcommerz 
        if (response.status == 'VALID') {

            // update payment_history table
            const payment_history = await PaymentHistory.update(
                {
                    status: "successful"
                }, {
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
            //console.log(updated_payment_history)

            // update payment table
            const payment = await Payment.findByPk(updated_payment_history.PaymentId)
            const updated_payment = await Payment.update({
                paid_amount: payment.paid_amount + updated_payment_history.amount,
                installments_completed: payment.installments_completed + 1
            }, {
                where: {
                    id: payment.id
                },
            });
            const updated_payment2 = await Payment.findByPk(payment.id)
            //console.log(updated_payment2)

            responseData = {
                payment_history: updated_payment_history,
                payment: updated_payment2,
                data: data
            }
            console.log('returning to frontend')
            return res.status(200).redirect(process.env.FRONTEND_URL + 'payment/' + payment.id)
            // res.status(200).json({
            //     responseCode: 1,
            //     responseMessage: 'Success',
            //     responseData: responseData
            // });
        }
        else if (response.status == 'INVALID_TRANSACTION') {
            console.log('INVALID_TRANSACTION')
            res.status(200).json({
                responseCode: 0,
                responseMessage: 'Failure',
                responseData: responseData
            });
        } else if (response.status == 'VALIDATED') {
            console.log('validated')
            return res.status(200).redirect(process.env.FRONTEND_URL)
        }
    }).catch(error => {
        console.log(error);
    });
})


//sslcommerz failure
router.post('/failure', async (req, res) => {
    const data = req.body;
    //console.log('Here for data ', data)
    let responseData = {}

    const ssl = new SSLCommerzPayment(store_id, store_passwd, is_live)
    const validation = ssl.validate(data);
    validation.then(async response => {
        //console.log('Validation checking:');
        //process the response that got from sslcommerz
        if (response.status == 'INVALID_TRANSACTION') {
            console.log('INVALID_TRANSACTION')

            // update payment_history table
            const payment_history = await PaymentHistory.update(
                {
                    status: "failed"
                }, {
                where: {
                    transaction_id: data.tran_id
                },
            });
            const updated_payment_history = await PaymentHistory.findOne(
                {
                    where:
                    {
                        transaction_id: data.tran_id
                    },
                });
            //console.log(updated_payment_history)
            responseData = {
                payment_history: updated_payment_history,
                data: data
            }
            console.log('returning to frontend')
            return res.status(200).redirect(process.env.FRONTEND_URL)
            // return res.status(200).json({
            //     responseCode: 1,
            //     responseMessage: 'Success',
            //     responseData: responseData
            // });
        } else if (response.status == 'VALIDATED') {
            console.log('validated')
            return res.status(200).redirect(process.env.FRONTEND_URL)
        }
    }).catch(error => {
        console.log(error);
    });
})

//get dues under a certain project
router.get('/:id(\\d+)/dues', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const payment = await Payment.findByPk(req.params.id)
    var paymentJson = payment.toJSON();
    //console.log(paymentJson)

    const agency = await Agency.findByPk(paymentJson.AgencyId)
    paymentJson.agencyName = agency.name

    paymentJson.dueAmount = (paymentJson.total_amount - paymentJson.paid_amount).toFixed(2)
    paymentJson.remaining_installments = paymentJson.emi_installment_choice - paymentJson.installments_completed

    const today = new Date()
    const isPaidAfterCreated = Math.floor((paymentJson.updatedAt - paymentJson.createdAt) / (1000 * 60 * 60 * 24))
    var days = Math.floor((today - paymentJson.updatedAt) / (1000 * 60 * 60 * 24))

    if (days >= 0 && days < 30) {
        if (isPaidAfterCreated == 0) {
            paymentJson.overdue = 1
            paymentJson.message = days + " days overdue"
            if (paymentJson.remaining_installments > 0) {
                paymentJson.due_to_pay_now = (paymentJson.dueAmount / paymentJson.remaining_installments).toFixed(2)
            }
        } else if (paymentJson.dueAmount == 0) {
            paymentJson.overdue = 2
            paymentJson.message = "Full Payment Done"
            paymentJson.due_to_pay_now = 0
        }
        else {
            paymentJson.overdue = 0
            paymentJson.message = "Dues cleared for this month"
            paymentJson.due_to_pay_now = 0
        }
    } else {
        const months = Math.floor(days / 30)
        paymentJson.overdue = 1
        paymentJson.message = months + " months overdue"
        if (paymentJson.remaining_installments > 0 && months > 0) {
            paymentJson.due_to_pay_now = months * (paymentJson.dueAmount / paymentJson.remaining_installments).toFixed(2)
        }
    }



    const response = {
        responseCode: 1,
        responseMessage: 'Success',
        responseData: paymentJson
    }
    res.json(response)
})

//calculate total amount for different EMI choices
// router.put('/:id(\\d+)/calculateEMI', passport.authenticate('jwt', { session: false }), async (req, res) => {
//     var payment = await Payment.findByPk(req.params.id)        
//     var paymentJson

//     // get params from body
//     const N = req.body.emi_installment_choice
//     const P = req.body.total_amount
//     const R = req.body.rate /100.0
//     //console.log("N=",N," P=", P, " R=",R)

//     if(payment.category == "EMI"){
//         // calculate total_amount using EMI formula PR(1+R)^N/[((1+R)^N)-1]
//         var amount_per_installment = (P * R * Math.pow((1 + R), N)) / (Math.pow((1 + R), N) - 1)
//         amount_per_installment = Number(amount_per_installment.toFixed(2))
//         var total_amount = amount_per_installment * N
//         total_amount = Number(total_amount.toFixed(2))
//         //console.log("total_amount=", total_amount, " amount_per_installment=", amount_per_installment)

//         await payment.update({
//             total_amount: total_amount
//         })

//         paymentJson = payment.toJSON()
//         paymentJson.amount_per_installment = amount_per_installment
//     }
//     res.json({
//         responseCode: 1,
//         responseMessage: 'Success',
//         responseData: paymentJson
//     })
// })



module.exports = router