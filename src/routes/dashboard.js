const express = require('express');
const router = express.Router();
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Request, ReqAgency } = require('../models/associations')


router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    const type = decodedToken.type
    const associatedId = decodedToken.associatedId
    const response = {}

    if (type === 1) {
        const requests = await Request.findAll({
            include: {
                model: ReqAgency,
                where: {
                    CompanyId: associatedId
                }
            }    
        })
        response.requests = requests.length

        const responses = await ReqAgency.findAll({
            where: {
                CompanyId: associatedId
            }
        })

        // find accepted responses where response.accepted is true and response.finalized is false
        const acceptedResponses = responses.filter(response => response.accepted === true && response.finalized === false)
        response.responses = acceptedResponses.length

    } else {
        
    }

    res.send(response)
})


module.exports = router