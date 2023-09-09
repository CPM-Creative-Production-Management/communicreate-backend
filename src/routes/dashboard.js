const express = require('express');
const router = express.Router();
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Company, Request, ReqAgency, Estimation, Review } = require('../models/associations')


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

    }
    else {
        const agency = await Agency.findByPk(associatedId, {
            include: [
                {
                    model: ReqAgency,
                    attributes: { exclude: ['accepted', 'finalized', 'createdAt', 'updatedAt', 'AgencyId', 'id', 'EstimationId', 'CompanyId'] },
                    include: [
                        {
                            model: Review,
                            required: true,
                        },
                        {
                            model: Company,
                        }
                    ],
                }
            ],
        })
        // add the company from reqAgency to review
        agency.ReqAgencies.forEach(reqAgency => {
            if (reqAgency.Review) {
                reqAgency.Review.dataValues.Company = reqAgency.Company
            }
        })

        const rawReviews = agency.ReqAgencies.map(reqAgency => {
            if (reqAgency.Review) {
                return reqAgency.Review
            }
        })

        delete agency.dataValues.ReqAgencies

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
        response.review = rawReviews
    }
    res.send(response)
})


module.exports = router