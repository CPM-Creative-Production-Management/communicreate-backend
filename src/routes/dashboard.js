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
                    accepted: true,
                },
                include: {
                    model: Estimation,
                    where: {
                        is_completed: false,
                        is_rejected: false
                    }
                }
            }
        })

        const newRequests = await Request.findAll({
            include: {
                model: ReqAgency,
                where: {
                    CompanyId: associatedId,
                    accepted: false,
                }
            }
        })
        
        response.requests = requests.length + newRequests.length

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

        // send data for pie chart. X-axis: Month, Y-axis: Number of finalized requests
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
            attributes: ['res_deadline']
        })

        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'June',
            'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
        ];

        // Loop through the fetched requests and group them by month
        const requestsByMonth = {};
        const monthName = {};
        requests.forEach(request => {
            const res_deadline = request.get('res_deadline');
            if (res_deadline) {
                const dateObj = new Date(res_deadline);
                const month = dateObj.getMonth();
                monthName[month] = months[month];
                if (requestsByMonth[month]) {
                    requestsByMonth[month]++;
                } else {
                    requestsByMonth[month] = 1;
                }
            }
        });

        // Convert the requestsByMonth object into an array of objects with month and count properties
        const dataForPieChart = Object.entries(requestsByMonth).map(([month, projects]) => ({
            month: monthName[month],
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

        // Loop through the fetched estimations and group them by month
        const estimationsByMonth = {};
        const monthName2 = {};
        estimations.forEach(estimation => {
            const createdAt = estimation.get('createdAt');
            if (createdAt) {
                const dateObj = new Date(createdAt);
                const month = dateObj.getMonth();
                monthName2[month] = months[month];
                if (estimationsByMonth[month]) {
                    estimationsByMonth[month] += estimation.get('cost');
                } else {
                    estimationsByMonth[month] = estimation.get('cost');
                }
            }
        });

        // Convert the estimationsByMonth object into an array of objects with month and budget properties
        const dataForBarChart = Object.entries(estimationsByMonth).map(([month, budget]) => ({
            month: monthName2[month],
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
            attributes: ['res_deadline']
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
            attributes: ['res_deadline']
        })

        // Loop through the fetched requests and group them by month
        const acceptedRequestsByMonth = {};
        acceptedRequests.forEach(request => {
            const resDeadline = request.get('res_deadline');
            if (resDeadline) {
                const dateObj = new Date(resDeadline);
                const month = dateObj.getMonth();
                if (acceptedRequestsByMonth[month]) {
                    acceptedRequestsByMonth[month]++;
                } else {
                    acceptedRequestsByMonth[month] = 1;
                }
            }
        });

        // Loop through the fetched requests and group them by month
        const rejectedRequestsByMonth = {};
        rejectedRequests.forEach(request => {
            const resDeadline = request.get('res_deadline');
            if (resDeadline) {
                const dateObj = new Date(resDeadline);
                const month = dateObj.getMonth();
                if (rejectedRequestsByMonth[month]) {
                    rejectedRequestsByMonth[month]++;
                } else {
                    rejectedRequestsByMonth[month] = 1;
                }
            }
        });

        const requestsByMonth2 = {};

        // Loop through acceptedRequests and populate the requestsByMonth2 object
        acceptedRequests.forEach(request => {
            const resDeadline = request.get('res_deadline');
            if (resDeadline) {
                const month = new Date(resDeadline).getMonth();
                if (!requestsByMonth2[month]) {
                    requestsByMonth2[month] = { accepted: 0, rejected: 0 };
                }
                requestsByMonth2[month].accepted++;
            }
        });

        // Loop through rejectedRequests and update the requestsByMonth2 object
        rejectedRequests.forEach(request => {
            const resDeadline = request.get('res_deadline');
            if (resDeadline) {
                const month = new Date(resDeadline).getMonth();
                if (!requestsByMonth2[month]) {
                    requestsByMonth2[month] = { accepted: 0, rejected: 0 };
                }
                requestsByMonth2[month].rejected++;
            }
        });

        // Convert the requestsByMonth2 object into an array of objects with month, accepted, and rejected properties
        const dataForLineChart = Object.entries(requestsByMonth2).map(([month, counts]) => ({
            monthName: months[parseInt(month)],
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