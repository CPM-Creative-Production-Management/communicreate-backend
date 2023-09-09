const express = require('express');
const router = express.Router();
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Company, Request, ReqAgency, Estimation, Review } = require('../models/associations')
const Sequelize = require('sequelize');

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

        // send data for pie chart. X-axis: Year, Y-axis: Number of finalized requests
        const requests = await Request.findAll({
            include: [
                {
                    model: ReqAgency,
                    where: {
                        AgencyId: associatedId,
                        accepted: true,
                        finalized: true
                    },
                    include: {
                        model: Estimation,
                        where: {
                            is_rejected: false
                        }
                    }
                }
            ],
            attributes: ['comp_deadline']
        })

        // Loop through the fetched requests and group them by year
        const requestsByYear = {};
        requests.forEach(request => {
            const compDeadline = request.get('comp_deadline');
            if (compDeadline) {
                const dateObj = new Date(compDeadline);
                const year = dateObj.getFullYear();
                if (requestsByYear[year]) {
                    requestsByYear[year]++;
                } else {
                    requestsByYear[year] = 1;
                }
            }
        });

        // Convert the requestsByYear object into an array of objects with year and count properties
        const dataForPieChart = Object.entries(requestsByYear).map(([year, projects]) => ({
            year: parseInt(year),
            projects,
        }));

        // send a Bar graph data. X-axis: Year, Y-axis: Sum of cost of all the estimations where is_completed=true.
        const estimations = await Estimation.findAll({
            attributes: ['createdAt', 'cost'],
            where: {
                is_rejected: false
            },
            include: {
                model: ReqAgency,
                where: {
                    AgencyId: associatedId,
                    accepted: true,
                    finalized: true
                }
            },
        })

        // Loop through the fetched requests and group them by year
        const estimationsByYear = {};
        estimations.forEach(estimation => {
            const createdAt = estimation.get('createdAt');
            if (createdAt) {
                const dateObj = new Date(createdAt);
                const year = dateObj.getFullYear();
                if (estimationsByYear[year]) {
                    estimationsByYear[year] += estimation.get('cost');
                } else {
                    estimationsByYear[year] = estimation.get('cost');
                }
            }
        });

        // Convert the requestsByYear object into an array of objects with year and count properties
        const dataForBarChart = Object.entries(estimationsByYear).map(([year, budget]) => ({
            year: parseInt(year),
            budget,
        }));

        // send data for line chart. X-axis: Year, Y-axis: Number of accepted requests VS Number of rejected requests
        const acceptedRequests = await Request.findAll({
            include: [
                {
                    model: ReqAgency,
                    where: {
                        AgencyId: associatedId,
                        accepted: true,
                        finalized: true
                    },
                    include: {
                        model: Estimation,
                        where: {
                            is_rejected: false
                        }
                    }
                }
            ],
            attributes: ['comp_deadline']
        })

        const rejectedRequests = await Request.findAll({
            include: [
                {
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
                }
            ],
            attributes: ['comp_deadline']
        })

        // Loop through the fetched requests and group them by year
        const acceptedRequestsByYear = {};
        acceptedRequests.forEach(request => {
            const compDeadline = request.get('comp_deadline');
            if (compDeadline) {
                const dateObj = new Date(compDeadline);
                const year = dateObj.getFullYear();
                if (acceptedRequestsByYear[year]) {
                    acceptedRequestsByYear[year]++;
                } else {
                    acceptedRequestsByYear[year] = 1;
                }
            }
        });

        // Loop through the fetched requests and group them by year
        const rejectedRequestsByYear = {};
        rejectedRequests.forEach(request => {
            const compDeadline = request.get('comp_deadline');
            if (compDeadline) {
                const dateObj = new Date(compDeadline);
                const year = dateObj.getFullYear();
                if (rejectedRequestsByYear[year]) {
                    rejectedRequestsByYear[year]++;
                } else {
                    rejectedRequestsByYear[year] = 1;
                }
            }
        });

        const requestsByYear2 = {};

        // Loop through acceptedRequests and populate the requestsByYear2 object
        acceptedRequests.forEach(request => {
            const compDeadline = request.get('comp_deadline');
            if (compDeadline) {
                const year = new Date(compDeadline).getFullYear();
                if (!requestsByYear2[year]) {
                    requestsByYear2[year] = { accepted: 0, rejected: 0 };
                }
                requestsByYear2[year].accepted++;
            }
        });

        // Loop through rejectedRequests and update the requestsByYear2 object
        rejectedRequests.forEach(request => {
            const compDeadline = request.get('comp_deadline');
            if (compDeadline) {
                const year = new Date(compDeadline).getFullYear();
                if (!requestsByYear2[year]) {
                    requestsByYear2[year] = { accepted: 0, rejected: 0 };
                }
                requestsByYear2[year].rejected++;
            }
        });

        // Convert the requestsByYear2 object into an array of objects with year, accepted, and rejected properties
        const dataForLineChart = Object.entries(requestsByYear2).map(([year, counts]) => ({
            year: parseInt(year),
            accepted: counts.accepted || 0,
            rejected: counts.rejected || 0,
        }));
        console.log(dataForLineChart)



        response.ongoingProjects = ongoingProjects
        response.completedProjects = completedProjects
        response.rejectedProjects = rejectedProjects
        response.review = rawReviews
        response.pieChart = dataForPieChart
        response.barChart = dataForBarChart
        response.lineChart = dataForLineChart
    }
    res.send(response)
})

module.exports = router