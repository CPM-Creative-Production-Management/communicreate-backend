const express = require('express')
const crypto = require("crypto");
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
require('dotenv').config({ path: '../../.env' });
const { Agency } = require('../models/associations')
const { Company } = require('../models/associations')
const { Payment, Estimation, ReqAgency, Request, Task } = require('../models/associations')
const { PaymentHistory } = require('../models/associations')
const bodyParser = require('body-parser').json()
const notificationUtils = require('../utils/notification')

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
    const newPayment = await Payment.create({
        total_amount: req.body.amount,          //SSLCommerz can allow 10.00 BDT to 500000.00 BDT per transaction
        paid_amount: 0,
        payment_type: req.body.payment_type,                // Full = 0 / Taskwise = 1
        EstimationId: req.body.estimation_id,              //estimation_id
        CompanyId: req.body.company_id,                    // customer name = company id
        AgencyId: req.body.agency_id,                      // ship name = agency id
    }).then(function (data) {
        res.json({
            responseCode: 1,
            responseMessage: 'Success',
            payment_id: data.id,
            responseData: data
        });
    }).catch(function (err) {
        const error = {
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
    const payment_id = req.params.id
    const payment = await Payment.findByPk(payment_id)
    console.log(payment)

    let amount = 0
    let task_id = 0
    if (payment.payment_type === 0) {
        // FULL PAYMENT
        amount = payment.total_amount - payment.paid_amount
        const tasks = await Task.findAll({
            where: {
                EstimationId: payment.EstimationId
            }
        })
        console.log("TASKS---->", tasks)
        task_id = tasks[0].id           //any task id will do, we are taking the first one
        console.log("TASK ID---->", task_id)
    }
    else {
        // TASKWISE PAYMENT
        task_id = req.body.taskId
        const task = await Task.findByPk(task_id)
        console.log("Task : ", task)
        amount = task.cost

        // count number of isPaid = 0 tasks under this particular estimation
        const remaining_tasks_count = await Task.count({
            where: {
                isPaid: 0,
                EstimationId: payment.EstimationId
            }
        })
        console.log(remaining_tasks_count)
        // if only one task is remaining, then pay the rest of the amount as well to complete the whole payment
        if (remaining_tasks_count == 1) {
            amount = payment.total_amount - payment.paid_amount
        }
    }

    const company = await Company.findByPk(payment.CompanyId)
    const company_email = company.email
    const company_phone = company.phone

    //insert into payment_history table
    const newPaymentHistory = await PaymentHistory.create({
        PaymentId: payment_id,
        transaction_id: transaction_id,
        amount: amount,
        status: 'pending',
        TaskId: task_id
    }).catch(function (err) {
        const error = {
            responseCode: 0,
            responseMessage: err.name,
            responseData: {}
        };
        res.json(error)
    });

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
            shipping_method: 'Online Payment',                  // not necessary
            product_name: payment.EstimationId,                 //estimation_id
            product_category: "Creative Content",               //not necessary
            emi_option: payment.payment_type,                   // 0 for full payment, 1 for taskwise payment
            emi_max_inst_option: 0,                            // Max installments we allow 0
            emi_selected_inst: 0,                               // 0
            emi_allow_only: 0,                                  // Value is always 0. If 1 then only EMI is possible, no Mobile banking and internet banking channel will not display. 
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

    const project = await Payment.findByPk(paymentJson.id, {
        include: [
            {
                model: Estimation,
                include: [
                    {
                        model: ReqAgency,
                        include: [
                            {
                                model: Request,
                                attributes: ['name'],
                            },
                        ],
                    },
                ],
            },
        ],
    });
    paymentJson.projectName = project.Estimation.ReqAgency.Request.name;

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
                paid_amount: payment.paid_amount + updated_payment_history.amount
            }, {
                where: {
                    id: payment.id
                },
            });
            const updated_payment2 = await Payment.findByPk(payment.id)
            console.log(updated_payment2)


            // update Task table. make isPaid = 1
            if (updated_payment2.payment_type == 0) {
                const tasks = await Task.findAll({
                    where: {
                        EstimationId: updated_payment2.EstimationId
                    }
                })
                for (var i = 0; i < tasks.length; i++) {
                    const updated_task = await Task.update({
                        isPaid: 1
                    }, {
                        where: {
                            id: tasks[i].id
                        },
                    });
                }
                const updated_task2 = await Task.findAll({
                    where: {
                        EstimationId: updated_payment2.EstimationId
                    }
                })
            }
            else{
                const task = await Task.findByPk(updated_payment_history.TaskId)
                const updated_task = await Task.update({
                    isPaid: 1
                }, {
                    where: {
                        id: task.id
                    },
                });
                const updated_task2 = await Task.findByPk(task.id)
                console.log(updated_task2)
            }

            responseData = {
                payment_history: updated_payment_history,
                payment: updated_payment2,
                data: data
            }
            console.log('returning to frontend')

            // send notification to agency regarding successful payment
            const company = await Company.findByPk(updated_payment2.CompanyId)
            const estimation = await Estimation.findByPk(updated_payment2.EstimationId, {
                include: {
                    model: ReqAgency,
                    include: {
                        model: Request,
                    }
                }
            })
            const notification = notificationUtils.sendAgencyNotification(
                updated_payment2.AgencyId,
                `Received payment of BDT ${updated_payment_history.amount} from ${company.name} for project ${estimation.ReqAgency.Request.name}`,
            )

            return res.status(200).redirect(process.env.FRONTEND_URL + '/dues')
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
            return res.status(200).redirect(process.env.FRONTEND_URL + '/dues')
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
            return res.status(200).redirect(process.env.FRONTEND_URL + '/dues')
            // return res.status(200).json({
            //     responseCode: 1,
            //     responseMessage: 'Success',
            //     responseData: responseData
            // });
        } else if (response.status == 'VALIDATED') {
            console.log('validated')
            return res.status(200).redirect(process.env.FRONTEND_URL + '/dues')
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

    const company = await Company.findByPk(paymentJson.CompanyId)
    paymentJson.companyName = company.name

    paymentJson.total_amount = paymentJson.total_amount.toFixed(2)
    paymentJson.paid_amount = paymentJson.paid_amount.toFixed(2)
    paymentJson.due_amount = (paymentJson.total_amount - paymentJson.paid_amount).toFixed(2)


    // Case 1: Due > 0. Tasks incomplete —> overdue = 0
    // Case 2: Due > 0. Task complete —> overdue = 1
    // Case 3: Due = 0. Tasks incomplete —> overdue = 2
    // Case 4: Due = 0. All tasks done —>  overdue = 3


    const tasks = await Task.findAll({
        where: {
            EstimationId: paymentJson.EstimationId
        }
    })
    paymentJson.tasks = tasks
    const unpaid_completed_tasks = tasks.filter(task => (task.status === 2 && task.isPaid === 0));
    const unpaid_incomplete_tasks = tasks.filter(task => (task.status !== 2 && task.isPaid === 0));
    const paid_completed_tasks = tasks.filter(task => (task.status === 2 && task.isPaid === 1));
    const paid_incomplete_tasks = tasks.filter(task => (task.status !== 2 && task.isPaid === 1));

    if (paymentJson.due_amount > 0) {
        if (unpaid_incomplete_tasks.length > 0) {
            paymentJson.overdue = 0
            paymentJson.message = "Tasks are incomplete. But advance payment can be made."
        }
        else if (unpaid_completed_tasks.length > 0) {
            paymentJson.overdue = 1
            paymentJson.message = "Payment Due for Completed Tasks."
        }
    }
    else if (paymentJson.due_amount == 0) {
        if (paid_incomplete_tasks.length > 0) {
            paymentJson.overdue = 2
            paymentJson.message = "No dues to be cleared. But tasks are still incomplete."
        }
        else if (paid_completed_tasks.length > 0) {
            paymentJson.overdue = 3
            paymentJson.message = "Full Payment Done."
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