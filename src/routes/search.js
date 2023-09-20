const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Request, Company, Agency, ReqAgency, RequestTask, Tag, Estimation, User, Task, Employee } = require('../models/associations')
const { Op } = require('sequelize');
const frontendURL = process.env.FRONTEND_URL

// search by any keyword for a company, agency, request name, estimation title or tag
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const associatedId = decodedToken.associatedId

        var keyword = "";
        const reqCondition = {};
        const agencyConditions = {};
        if (req.query.keyword) {
            keyword = req.query.keyword;
            reqCondition.name = {
                [Op.iLike]: `%${keyword}%`
            };
            agencyConditions.name = {
                [Op.iLike]: `%${keyword}%`
            };
        }
        console.log("keyword --------> ", keyword)

        var filter = [];
        if (req.query.filter) {
            filter = req.query.filter;
        }
        console.log("filter --------> ", filter)

        var searchTags = [];
        if (req.query.tag) {
            if (Array.isArray(req.query.tag)) {
                searchTags = req.query.tag.map(num => parseInt(num, 10));
            } else {
                searchTags = [parseInt(req.query.tag, 10)];
            }
        }
        console.log("searchTags --------> ", searchTags)

        var result = {
            employee: [],
            agency: [],
            request: [],
            estimation: []
        }

        const thisUser = await User.findOne({
            where:
            {
                associatedId: associatedId
            },
            attributes: {
                exclude: ['password']
            }
        });

        if (searchTags.length > 0) {
            // if tags are specified, search for only agencies and estimations with those tags
            if (filter.length === 0) {

                // find all agencies whose name this keyword matches with and have the specified tags
                const agencies = await Agency.findAll({
                    where: agencyConditions,
                    include: [{
                        model: Tag,
                        where: {
                            id: {
                                [Op.in]: searchTags
                            }
                        }
                    }]
                })
                agencies.forEach(agency => {
                    agency.dataValues.key = agency.name
                    agency.dataValues.value = agency.id
                    agency.dataValues.text = agency.name
                    agency.dataValues.details = agency.dataValues.description
                    // remove description from dataValues
                    delete agency.dataValues.description
                })
                var agencyJson = agencies.map(o => o.toJSON());
                for (var i = 0; i < agencyJson.length; i++) {
                    agencyJson[i].url = '/agency/' + agencyJson[i].id
                }
                result.agency = agencyJson

                // find all estimations whose name this keyword matches with and have the specified tags
                try {
                    const agencies = await Agency.findByPk(associatedId, {
                        include: [
                            {
                                model: ReqAgency,
                                include: [{
                                    model: Request,
                                    where: reqCondition,
                                    include: RequestTask
                                }, Company, Estimation
                                ],
                            }
                        ],
                    });
                    if (agencies === null) {
                        result.estimation = []
                    }
                    else {
                        for (const reqAgency of agencies.ReqAgencies) {
                            const estimation = await reqAgency.getEstimation({
                                include: [
                                    {
                                        model: Task,
                                        include: {
                                            model: Employee,
                                            through: false
                                        }
                                    },
                                    {
                                        model: Tag,
                                        where: {
                                            id: {
                                                [Op.in]: searchTags
                                            }
                                        },
                                    }
                                ],
                            })
                            if (estimation) {
                                reqAgency.dataValues.Estimation = estimation
                                reqAgency.dataValues.estimationExists = true
                            } else {
                                reqAgency.dataValues.estimationExists = false
                            }
                        }

                        // if reqAgency has Estimation, filter the ones where Estimation.is_completed is true
                        agencies.ReqAgencies = agencies.ReqAgencies.filter(reqAgency => {
                            if (reqAgency.Estimation) {
                                return !reqAgency.Estimation.is_completed
                            }
                            return false
                        })

                        // res.json(agencies.ReqAgencies)
                        // sort requests by date, show newest first
                        agencies.ReqAgencies.sort((a, b) => {
                            if (a.Estimation.createdAt > b.Estimation.createdAt) {
                                return -1
                            }
                            if (a.Estimation.createdAt < b.Estimation.createdAt) {
                                return 1
                            }
                            return 0
                        })
                    }
                    var estimationJson = agencies.ReqAgencies.map(o => o.toJSON());
                    console.log(estimationJson)
                    for (var i = 0; i < estimationJson.length; i++) {
                        if (thisUser.type === 2) {
                            //estimationJson[i].Estimation.url = '/edit-estimation/' + estimationJson[i].RequestId
                            estimationJson[i].url = '/edit-estimation/' + estimationJson[i].RequestId
                        } else {
                            //estimationJson[i].Estimation.url = '/request/' + estimationJson[i].RequestId + '/agency/' + estimationJson[i].AgencyId + '/estimation'
                            estimationJson[i].url = '/request/' + estimationJson[i].RequestId + '/agency/' + estimationJson[i].AgencyId + '/estimation'
                        }
                    }
                    for (var i = 0; i < estimationJson.length; i++) {
                        if (estimationJson[i].Estimation.Tasks) {
                            for (var j = 0; j < estimationJson[i].Estimation.Tasks.length; j++) {
                                for (var k = 0; k < estimationJson[i].Estimation.Tasks[j].Employees.length; k++) {
                                    estimationJson[i].Estimation.Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Estimation.Tasks[j].Employees[k].id
                                }
                            }
                        }
                    }
                    result.estimation = estimationJson
                } catch (error) {
                    console.error(error)
                }
            }
            else {

                if (filter.includes('agency')) {
                    // find all agencies whose name this keyword matches with
                    const agencies = await Agency.findAll({
                        where: agencyConditions,
                        include: [{
                            model: Tag,
                            where: {
                                id: {
                                    [Op.in]: searchTags
                                }
                            }
                        }]
                    })
                    agencies.forEach(agency => {
                        agency.dataValues.key = agency.name
                        agency.dataValues.value = agency.id
                        agency.dataValues.text = agency.name
                        agency.dataValues.details = agency.dataValues.description
                        // remove description from dataValues
                        delete agency.dataValues.description
                    })
                    var agencyJson = agencies.map(o => o.toJSON());
                    for (var i = 0; i < agencyJson.length; i++) {
                        agencyJson[i].url = '/agency/' + agencyJson[i].id
                    }
                    result.agency = agencyJson
                }
                if (filter.includes('estimation')) {
                    try {
                        const agencies = await Agency.findByPk(associatedId, {
                            include: [
                                {
                                    model: ReqAgency,
                                    include: [{
                                        model: Request,
                                        where: reqCondition,
                                        include: RequestTask
                                    }, Company, Estimation
                                    ],
                                }
                            ],
                        });
                        if (agencies === null) {
                            result.estimation = []
                        }
                        else {
                            for (const reqAgency of agencies.ReqAgencies) {
                                const estimation = await reqAgency.getEstimation({
                                    include: [
                                        {
                                            model: Task,
                                            include: {
                                                model: Employee,
                                                through: false
                                            }
                                        },
                                        {
                                            model: Tag,
                                            where: {
                                                id: {
                                                    [Op.in]: searchTags
                                                }
                                            },
                                        }
                                    ],
                                })
                                if (estimation) {
                                    reqAgency.dataValues.Estimation = estimation
                                    reqAgency.dataValues.estimationExists = true
                                } else {
                                    reqAgency.dataValues.estimationExists = false
                                }
                            }

                            // if reqAgency has Estimation, filter the ones where Estimation.is_completed is true
                            agencies.ReqAgencies = agencies.ReqAgencies.filter(reqAgency => {
                                if (reqAgency.Estimation) {
                                    return !reqAgency.Estimation.is_completed
                                }
                                return false
                            })

                            // res.json(agencies.ReqAgencies)
                            // sort requests by date, show newest first
                            agencies.ReqAgencies.sort((a, b) => {
                                if (a.Estimation.createdAt > b.Estimation.createdAt) {
                                    return -1
                                }
                                if (a.Estimation.createdAt < b.Estimation.createdAt) {
                                    return 1
                                }
                                return 0
                            })
                        }
                        var estimationJson = agencies.ReqAgencies.map(o => o.toJSON());
                        console.log(estimationJson)
                        for (var i = 0; i < estimationJson.length; i++) {
                            if (thisUser.type === 2) {
                                estimationJson[i].url = '/edit-estimation/' + estimationJson[i].RequestId
                            } else {
                                estimationJson[i].url = '/request/' + estimationJson[i].RequestId + '/agency/' + estimationJson[i].AgencyId + '/estimation'
                            }
                        }
                        for (var i = 0; i < estimationJson.length; i++) {
                            if (estimationJson[i].Estimation.Tasks) {
                                for (var j = 0; j < estimationJson[i].Estimation.Tasks.length; j++) {
                                    for (var k = 0; k < estimationJson[i].Estimation.Tasks[j].Employees.length; k++) {
                                        estimationJson[i].Estimation.Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Estimation.Tasks[j].Employees[k].id
                                    }
                                }
                            }
                        }
                        result.estimation = estimationJson
                    } catch (error) {
                        console.error(error)
                    }
                }
            }
        }
        else {
            // if tags are not specified, search for all entities

            if (filter.length === 0) {

                // if no filter, send all results
                if (thisUser.type === 2) {
                    //find which agency this user belongs to
                    const thisUserAgency = await Agency.findByPk(associatedId)

                    // find all employees of the agency whose name this keyword matches with
                    const employee = await thisUserAgency.getEmployees({
                        where: {
                            name: {
                                [Op.iLike]: `%${keyword}%`
                            }
                        }
                    });
                    var employeeJson = employee.map(o => o.toJSON());
                    for (var i = 0; i < employeeJson.length; i++) {
                        delete employeeJson[i].password
                        employeeJson[i].url = '/employee/' + employeeJson[i].id
                    }
                    result.employee = employeeJson
                }

                // find all agencies whose name this keyword matches with
                const agencies = await Agency.findAll({
                    where: agencyConditions,
                    include: [{
                        model: Tag
                    }]
                })
                agencies.forEach(agency => {
                    agency.dataValues.key = agency.name
                    agency.dataValues.value = agency.id
                    agency.dataValues.text = agency.name
                    agency.dataValues.details = agency.dataValues.description
                    // remove description from dataValues
                    delete agency.dataValues.description
                })
                var agencyJson = agencies.map(o => o.toJSON());
                for (var i = 0; i < agencyJson.length; i++) {
                    agencyJson[i].url = '/agency/' + agencyJson[i].id
                }
                result.agency = agencyJson

                // find all requests whose name this keyword matches with
                try {
                    const request = await Agency.findByPk(associatedId, {
                        include: [
                            {
                                model: ReqAgency,
                                include: [{
                                    model: Request,
                                    where: {
                                        name: {
                                            [Op.iLike]: `%${keyword}%`
                                        }
                                    },
                                    include: RequestTask
                                }, {
                                    model: Company,
                                },
                                {
                                    model: Estimation,
                                    where: {
                                        is_completed: false
                                    },
                                    include: [
                                        {
                                            model: Task,
                                        }
                                    ]
                                },
                                ],
                            }
                        ],
                    });
                    var requestJson = request.toJSON();
                    for (var i = 0; i < requestJson.ReqAgencies.length; i++) {
                        for (var j = 0; j < requestJson.ReqAgencies[i].Request.length; j++) {
                            requestJson.ReqAgencies[i].Request[j].url = '/requests'
                        }
                    }
                    result.request = requestJson.ReqAgencies
                } catch (error) {
                    console.error(error)
                }

                // find all archives whose name this keyword matches with
                try {
                    const archive = await Agency.findByPk(associatedId, {
                        include: [
                            {
                                model: ReqAgency,
                                include: [
                                    {
                                        model: Request,
                                        where: {
                                            name: {
                                                [Op.iLike]: `%${keyword}%`
                                            }
                                        },
                                        include: RequestTask
                                    },
                                    {
                                        model: Company,
                                    },
                                    {
                                        model: Estimation,
                                        where: {
                                            is_completed: true
                                        },
                                        include: [{
                                            model: Task,
                                        }
                                        ]
                                    },
                                ],
                            }
                        ],
                    });
                    var archiveJson = archive.toJSON();
                    for (var i = 0; i < archiveJson.ReqAgencies.length; i++) {
                        for (var j = 0; j < archiveJson.ReqAgencies[i].Request.length; j++) {
                            archiveJson.ReqAgencies[i].Request[j].url = '/archive'
                        }
                    }
                    result.archive = archiveJson.ReqAgencies
                } catch (error) {
                    console.error(error)
                }

                // find all estimations whose title this keyword matches with
                try {
                    const agencies = await Agency.findByPk(associatedId, {
                        include: [
                            {
                                model: ReqAgency,
                                include: [{
                                    model: Request,
                                    where: reqCondition,
                                    include: RequestTask
                                }, Company, Estimation
                                ],
                            }
                        ],
                    });
                    if (agencies === null) {
                        result.estimation = []
                    }
                    else {
                        for (const reqAgency of agencies.ReqAgencies) {
                            const estimation = await reqAgency.getEstimation({
                                include: [
                                    {
                                        model: Task,
                                        include: {
                                            model: Employee,
                                            through: false
                                        }
                                    },
                                ],
                            })
                            if (estimation) {
                                reqAgency.dataValues.Estimation = estimation
                                reqAgency.dataValues.estimationExists = true
                            } else {
                                reqAgency.dataValues.estimationExists = false
                            }
                        }

                        // if reqAgency has Estimation, filter the ones where Estimation.is_completed is true
                        agencies.ReqAgencies = agencies.ReqAgencies.filter(reqAgency => {
                            if (reqAgency.Estimation) {
                                return !reqAgency.Estimation.is_completed
                            }
                            return false
                        })

                        // res.json(agencies.ReqAgencies)
                        // sort requests by date, show newest first
                        agencies.ReqAgencies.sort((a, b) => {
                            if (a.Estimation.createdAt > b.Estimation.createdAt) {
                                return -1
                            }
                            if (a.Estimation.createdAt < b.Estimation.createdAt) {
                                return 1
                            }
                            return 0
                        })
                    }
                    var estimationJson = agencies.ReqAgencies.map(o => o.toJSON());
                    console.log(estimationJson)
                    for (var i = 0; i < estimationJson.length; i++) {
                        if (thisUser.type === 2) {
                            estimationJson[i].url = '/edit-estimation/' + estimationJson[i].RequestId
                        } else {
                            estimationJson[i].url = '/request/' + estimationJson[i].RequestId + '/agency/' + estimationJson[i].AgencyId + '/estimation'
                        }
                    }
                    for (var i = 0; i < estimationJson.length; i++) {
                        if (estimationJson[i].Estimation.Tasks) {
                            for (var j = 0; j < estimationJson[i].Estimation.Tasks.length; j++) {
                                for (var k = 0; k < estimationJson[i].Estimation.Tasks[j].Employees.length; k++) {
                                    estimationJson[i].Estimation.Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Estimation.Tasks[j].Employees[k].id
                                }
                            }
                        }
                    }
                    result.estimation = estimationJson
                } catch (error) {
                    console.error(error)
                }
            }
            else {
                // send only filtered results

                if (filter.includes('employee') && thisUser.type === 2) {
                    //find which agency this user belongs to
                    const thisUserAgency = await Agency.findByPk(associatedId)

                    // find all employees of the agency whose name this keyword matches with
                    const employee = await thisUserAgency.getEmployees({
                        where: {
                            name: {
                                [Op.iLike]: `%${keyword}%`
                            }
                        }
                    });
                    var employeeJson = employee.map(o => o.toJSON());
                    for (var i = 0; i < employeeJson.length; i++) {
                        delete employeeJson[i].password
                        employeeJson[i].url = '/employee/' + employeeJson[i].id
                    }
                    result.employee = employeeJson
                }

                if (filter.includes('agency')) {
                    // find all agencies whose name this keyword matches with
                    const agencies = await Agency.findAll({
                        where: agencyConditions,
                        include: [{
                            model: Tag
                        }]
                    })
                    agencies.forEach(agency => {
                        agency.dataValues.key = agency.name
                        agency.dataValues.value = agency.id
                        agency.dataValues.text = agency.name
                        agency.dataValues.details = agency.dataValues.description
                        // remove description from dataValues
                        delete agency.dataValues.description
                    })
                    var agencyJson = agencies.map(o => o.toJSON());
                    for (var i = 0; i < agencyJson.length; i++) {
                        agencyJson[i].url = '/agency/' + agencyJson[i].id
                    }
                    result.agency = agencyJson
                }

                if (filter.includes('request')) {
                    try {
                        const request = await Agency.findByPk(associatedId, {
                            include: [
                                {
                                    model: ReqAgency,
                                    include: [{
                                        model: Request,
                                        where: {
                                            name: {
                                                [Op.iLike]: `%${keyword}%`
                                            }
                                        },
                                        include: RequestTask
                                    }, {
                                        model: Company,
                                    },
                                    {
                                        model: Estimation,
                                        where: {
                                            is_completed: false
                                        },
                                        include: [{
                                            model: Task,
                                        }
                                        ]
                                    },
                                    ],
                                }
                            ],
                        });
                        var requestJson = request.toJSON();
                        for (var i = 0; i < requestJson.ReqAgencies.length; i++) {
                            for (var j = 0; j < requestJson.ReqAgencies[i].Request.length; j++) {
                                requestJson.ReqAgencies[i].Request[j].url = '/requests'
                            }
                        }
                        result.request = requestJson.ReqAgencies
                    } catch (error) {
                        console.error(error)
                    }
                }

                if (filter.includes('archive')) {
                    // find all archives whose name this keyword matches with
                    try {
                        const archive = await Agency.findByPk(associatedId, {
                            include: [
                                {
                                    model: ReqAgency,
                                    include: [
                                        {
                                            model: Request,
                                            where: {
                                                name: {
                                                    [Op.iLike]: `%${keyword}%`
                                                }
                                            },
                                            include: RequestTask
                                        },
                                        {
                                            model: Company,
                                        },
                                        {
                                            model: Estimation,
                                            where: {
                                                is_completed: true
                                            },
                                            include: [{
                                                model: Task,
                                            }
                                            ]
                                        },
                                    ],
                                }
                            ],
                        });
                        var archiveJson = archive.toJSON();
                        for (var i = 0; i < archiveJson.ReqAgencies.length; i++) {
                            for (var j = 0; j < archiveJson.ReqAgencies[i].Request.length; j++) {
                                archiveJson.ReqAgencies[i].Request[j].url = '/archive'
                            }
                        }
                        result.archive = archiveJson.ReqAgencies
                    } catch (error) {
                        console.error(error)
                    }
                }

                if (filter.includes('estimation')) {
                    try {
                        const agencies = await Agency.findByPk(associatedId, {
                            include: [
                                {
                                    model: ReqAgency,
                                    include: [{
                                        model: Request,
                                        where: reqCondition,
                                        include: RequestTask
                                    }, Company, Estimation
                                    ],
                                }
                            ],
                        });
                        if (agencies === null) {
                            result.estimation = []
                        }
                        else {
                            for (const reqAgency of agencies.ReqAgencies) {
                                const estimation = await reqAgency.getEstimation({
                                    include: [
                                        {
                                            model: Task,
                                            include: {
                                                model: Employee,
                                                through: false
                                            }
                                        },
                                    ],
                                })
                                if (estimation) {
                                    reqAgency.dataValues.Estimation = estimation
                                    reqAgency.dataValues.estimationExists = true
                                } else {
                                    reqAgency.dataValues.estimationExists = false
                                }
                            }

                            // if reqAgency has Estimation, filter the ones where Estimation.is_completed is true
                            agencies.ReqAgencies = agencies.ReqAgencies.filter(reqAgency => {
                                if (reqAgency.Estimation) {
                                    return !reqAgency.Estimation.is_completed
                                }
                                return false
                            })

                            // res.json(agencies.ReqAgencies)
                            // sort requests by date, show newest first
                            agencies.ReqAgencies.sort((a, b) => {
                                if (a.Estimation.createdAt > b.Estimation.createdAt) {
                                    return -1
                                }
                                if (a.Estimation.createdAt < b.Estimation.createdAt) {
                                    return 1
                                }
                                return 0
                            })
                        }
                        var estimationJson = agencies.ReqAgencies.map(o => o.toJSON());
                        console.log(estimationJson)
                        for (var i = 0; i < estimationJson.length; i++) {
                            if (thisUser.type === 2) {
                                estimationJson[i].url = '/edit-estimation/' + estimationJson[i].RequestId
                            } else {
                                estimationJson[i].url = '/request/' + estimationJson[i].RequestId + '/agency/' + estimationJson[i].AgencyId + '/estimation'
                            }
                        }
                        for (var i = 0; i < estimationJson.length; i++) {
                            if (estimationJson[i].Estimation.Tasks) {
                                for (var j = 0; j < estimationJson[i].Estimation.Tasks.length; j++) {
                                    for (var k = 0; k < estimationJson[i].Estimation.Tasks[j].Employees.length; k++) {
                                        estimationJson[i].Estimation.Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Estimation.Tasks[j].Employees[k].id
                                    }
                                }
                            }
                        }
                        result.estimation = estimationJson
                    } catch (error) {
                        console.error(error)
                    }
                }
            }
        }
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})


// search for a company by its name or any substring of its name
router.get('/company', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const keyword = req.query.keyword;
        const company = await Company.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${keyword}%`
                }
            }
        })
        res.json(company)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

// search for an agency by its name or any substring of its name
router.get('/agency', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const keyword = req.query.keyword;
        const agency = await Agency.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${keyword}%`
                }
            }
        })
        res.json(agency)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

// search for a request by its title or any substring of its title
router.get('/request', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const associatedId = decodedToken.associatedId;
        const keyword = req.query.keyword;

        const request = await Request.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${keyword}%`
                }
            },
            include: [
                {
                    model: ReqAgency,
                    attributes: ['AgencyId', 'CompanyId'],
                    where: {
                        [Op.or]: [{ AgencyId: associatedId }, { CompanyId: associatedId }]
                    },
                    include: [
                        {
                            model: Agency
                        },
                        {
                            model: Company
                        },
                    ]
                },
            ],
        })
        res.json(request)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

// search for an estimation by its tag
router.get('/tag', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const associatedId = decodedToken.associatedId
        const keyword = req.query.keyword;

        const tag = await Tag.findAll({
            where: {
                tag: {
                    [Op.iLike]: `%${keyword}%`
                }
            },
            include: [
                {
                    model: Estimation,
                    include: [
                        {
                            model: ReqAgency,
                            attributes: ['AgencyId', 'CompanyId'],
                            where: {
                                [Op.or]: [{ AgencyId: associatedId }, { CompanyId: associatedId }]
                            },
                            include: [
                                {
                                    model: Agency
                                },
                                {
                                    model: Company
                                },
                            ],
                        },
                    ],
                },
            ],
        })
        res.json(tag)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

module.exports = router
