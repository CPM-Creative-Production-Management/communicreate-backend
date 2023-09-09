const cron = require('node-cron')
const schedule = require('node-schedule')
const {ReqAgency, Company, Agency, Request} = require('../models/associations')
const { sendAgencyNotification, sendCompanyNotification } = require('./notification')
const { Op } = require('sequelize')

// scheduler to delete reqagency if accept is false
schedule.scheduleJob('0 0 * * *', async () => {
    // delete reqagency if accept is false
    // and corresponding request res_deadline is less than current date
    console.log('Running daily cleanup')
    const requests = await Request.findAll({
        where: {
            res_deadline: {
                [Op.lt]: new Date()
            }
        }
    })
    let reqAgencies = []
    for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const tempReqAgencies = await ReqAgency.findAll({
            where: {
                RequestId: request.id,
                accepted: false
            }
        })
        reqAgencies = reqAgencies.concat(tempReqAgencies)
    }

    console.log(reqAgencies.length, 'reqagencies found')
    for (let i = 0; i < reqAgencies.length; i++) {
        const reqAgency = reqAgencies[i];
        // get companyid
        const companyId = reqAgency.CompanyId
        const requestId = reqAgency.RequestId
        const agencyId = reqAgency.AgencyId
        const request = await Request.findByPk(requestId)
        console.log(`Deleting for request ${requestId} of company ${companyId} sent to agency ${agencyId}`)
        // find all reqagencies of that company 
        await reqAgency.destroy()
        const newReqAgencies = await ReqAgency.findAll({
            where: {
                RequestId: requestId
            }
        })
        // if no reqagencies left, send a notification to company
        if (newReqAgencies.length === 0) {
            await sendCompanyNotification(companyId, `No agency accepted your request for ${request.name}. You can apply again.`, null, 'request')
            console.log('Sent notification to company', companyId)
        }
    }
});

module.exports = schedule