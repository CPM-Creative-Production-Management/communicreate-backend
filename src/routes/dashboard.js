    const express = require('express');
const router = express.Router();
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Request, ReqAgency, Estimation } = require('../models/associations')


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
                    CompanyId: associatedId,
                }
            }
        })
        response.requests = requests.length

        const ongoingProjects = await Request.count({
            include: [{
                model: ReqAgency,
                where: {
                    CompanyId: associatedId,
                    accepted: true,
                    finalized: true
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: false,
                        is_rejected: false

                    }
                }
            }]
        })

        const completedProjects = await Request.count({
            include: [{
                model: ReqAgency,
                where: {
                    CompanyId: associatedId,
                    accepted: true,
                    finalized: true
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: true,
                        is_rejected: false

                    }
                }
            }]
        })

        const rejectedProjects = await Request.count({
            include: [{
                model: ReqAgency,
                where: {
                    CompanyId: associatedId,
                    accepted: true,
                    finalized: true
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: false,
                        is_rejected: true

                    }
                }
            }]
        })

        response.ongoingProjects = ongoingProjects
        response.completedProjects = completedProjects
        response.rejectedProjects = rejectedProjects

    } else {
        //     const ongoingEstimations = await Agency.findByPk(associatedId, {
        //     include: [
        //         {
        //             model: ReqAgency,
        //             where: {
        //                 accepted: accepted,
        //                 finalized: finalized,
        //             },
        //             include: [{
        //                 model: Request,
        //                 include: RequestTask
        //             }, Company, Estimation],
        //             // attributes: {
        //             //     exclude: ['id', 'accepted', 'finalized', 'ReqAgencyId']
        //             // }
        //         }
        // ],
        // })
        const ongoingProjects = await Request.count({
            include: [{
                model: ReqAgency,
                where: {
                    AgencyId: associatedId,
                    accepted: true,
                    finalized: true
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: false,
                        is_rejected: false

                    }
                }
            }]
        })

        const completedProjects = await Request.count({
            include: [{
                model: ReqAgency,
                where: {
                    AgencyId: associatedId,
                    accepted: true,
                    finalized: true
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: true,
                        is_rejected: false

                    }
                }
            }]
        })

        const rejectedProjects = await Request.count({
            include: [{
                model: ReqAgency,
                where: {
                    AgencyId: associatedId,
                    accepted: true,
                    finalized: true
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: false,
                        is_rejected: true
                    }
                }
            }]
        })

        response.ongoingProjects = ongoingProjects
        response.completedProjects = completedProjects
        response.rejectedProjects = rejectedProjects
    }
    res.send(response)
})


module.exports = router