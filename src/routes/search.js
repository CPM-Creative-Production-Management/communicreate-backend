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
                const agency = await Agency.findAll({
                    where: agencyConditions,
                    include: [
                        {
                            model: Tag,
                            where: {
                                id: {
                                    [Op.in]: searchTags
                                }
                            },
                        }
                    ]
                });
                var agencyJson = agency.map(o => o.toJSON());
                for (var i = 0; i < agencyJson.length; i++) {
                    agencyJson[i].url = '/agency/' + agencyJson[i].id
                }
                result.agency = agencyJson

                try {
                    const estimation = await Estimation.findAll({
                        include:
                            [
                                {
                                    model: ReqAgency,
                                    where: {
                                        [Op.or]: [{ AgencyId: associatedId }, { CompanyId: associatedId }]
                                    },
                                    include:
                                        [
                                            {
                                                model: Request,
                                                where: reqCondition
                                            }
                                        ]
                                },
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
                                    }
                                }
                            ],
                    });
                    console.log(estimation)
                    var estimationJson = estimation.map(o => o.toJSON());
                    for (var i = 0; i < estimationJson.length; i++) {
                        if (thisUser.type === 2) {
                            estimationJson[i].url = '/edit-estimation/' + estimationJson[i].ReqAgency.RequestId
                        } else {
                            estimationJson[i].url = '/request/' + estimationJson[i].ReqAgency.RequestId + '/agency/' + estimationJson[i].ReqAgency.AgencyId + '/estimation'
                        }
                    }
                    for(var i = 0; i < estimationJson.length; i++) {
                        for(var j = 0; j < estimationJson[i].Tasks.length; j++) {
                            for(var k = 0; k < estimationJson[i].Tasks[j].Employees.length; k++) {
                                estimationJson[i].Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Tasks[j].Employees[k].id
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
                    const agency = await Agency.findAll({
                        where: agencyConditions,
                        include: [
                            {
                                model: Tag,
                                where: {
                                    id: {
                                        [Op.in]: searchTags
                                    }
                                },
                            }
                        ]
                    });
                    var agencyJson = agency.map(o => o.toJSON());
                    for (var i = 0; i < agencyJson.length; i++) {
                        agencyJson[i].url = '/agency/' + agencyJson[i].id
                    }
                    result.agency = agencyJson
                }
                if (filter.includes('estimation')) {
                    try {
                        const estimation = await Estimation.findAll({
                            include:
                                [
                                    {
                                        model: ReqAgency,
                                        where: {
                                            [Op.or]: [{ AgencyId: associatedId }, { CompanyId: associatedId }]
                                        },
                                        include:
                                            [
                                                {
                                                    model: Request,
                                                    where: reqCondition
                                                }
                                            ]
                                    },
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
                                        }
                                    }
                                ],
                        });
                        console.log(estimation)
                        var estimationJson = estimation.map(o => o.toJSON());
                        for (var i = 0; i < estimationJson.length; i++) {
                            if (thisUser.type === 2) {
                                estimationJson[i].url = '/edit-estimation/' + estimationJson[i].ReqAgency.RequestId
                            } else {
                                estimationJson[i].url = '/request/' + estimationJson[i].ReqAgency.RequestId + '/agency/' + estimationJson[i].ReqAgency.AgencyId + '/estimation'
                            }
                        }
                        for(var i = 0; i < estimationJson.length; i++) {
                            for(var j = 0; j < estimationJson[i].Tasks.length; j++) {
                                for(var k = 0; k < estimationJson[i].Tasks[j].Employees.length; k++) {
                                    estimationJson[i].Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Tasks[j].Employees[k].id
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

                const agency = await Agency.findAll({
                    where: {
                        name: {
                            [Op.iLike]: `%${keyword}%`
                        }
                    }
                });
                var agencyJson = agency.map(o => o.toJSON());
                for (var i = 0; i < agencyJson.length; i++) {
                    agencyJson[i].url = '/agency/' + agencyJson[i].id
                }
                result.agency = agencyJson

                try {
                    const request = await Request.findAll({
                        where: {
                            name: {
                                [Op.iLike]: `%${keyword}%`
                            }
                        },
                        include: [
                            {
                                model: ReqAgency,
                                include: [{
                                    model: Request,
                                    include: RequestTask
                                }, Company, Estimation],
                            }
                        ],
                    });
                    console.log(request)
                    var requestJson = request.map(o => o.toJSON());
                    for (var i = 0; i < requestJson.length; i++) {
                        if (thisUser.type === 2) {
                            requestJson[i].url = '/requests'
                        }
                        else {
                            requestJson[i].url = '/my-requests'
                        }
                    }
                    result.request = requestJson
                } catch (error) {
                    console.error(error)
                }

                try {
                    const estimation = await Estimation.findAll({
                        include:
                            [
                                {
                                    model: ReqAgency,
                                    where: {
                                        [Op.or]: [{ AgencyId: associatedId }, { CompanyId: associatedId }]
                                    },
                                    include:
                                        [
                                            {
                                                model: Request,
                                                where: reqCondition
                                            }
                                        ]
                                },
                                {
                                    model: Task,
                                    include: {
                                        model: Employee,
                                        through: false
                                    }
                                }
                            ],
                    });
                    console.log(estimation)
                    var estimationJson = estimation.map(o => o.toJSON());
                    for (var i = 0; i < estimationJson.length; i++) {
                        if (thisUser.type === 2) {
                            estimationJson[i].url = '/edit-estimation/' + estimationJson[i].ReqAgency.RequestId
                        } else {
                            estimationJson[i].url = '/request/' + estimationJson[i].ReqAgency.RequestId + '/agency/' + estimationJson[i].ReqAgency.AgencyId + '/estimation'
                        }
                    }
                    for(var i = 0; i < estimationJson.length; i++) {
                        for(var j = 0; j < estimationJson[i].Tasks.length; j++) {
                            for(var k = 0; k < estimationJson[i].Tasks[j].Employees.length; k++) {
                                estimationJson[i].Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Tasks[j].Employees[k].id
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
                    const agency = await Agency.findAll({
                        where: {
                            name: {
                                [Op.iLike]: `%${keyword}%`
                            }
                        }
                    });
                    var agencyJson = agency.map(o => o.toJSON());
                    for (var i = 0; i < agencyJson.length; i++) {
                        agencyJson[i].url = '/agency/' + agencyJson[i].id
                    }
                    result.agency = agencyJson
                }
                if (filter.includes('request')) {
                    try {
                        const request = await Request.findAll({
                            where: {
                                name: {
                                    [Op.iLike]: `%${keyword}%`
                                }
                            },
                            include: [
                                {
                                    model: ReqAgency,
                                    include: [{
                                        model: Request,
                                        include: RequestTask
                                    }, Company, Estimation],
                                }
                            ],
                        });
                        console.log(request)
                        var requestJson = request.map(o => o.toJSON());
                        for (var i = 0; i < requestJson.length; i++) {
                            if (thisUser.type === 2) {
                                requestJson[i].url = '/requests'
                            }
                            else {
                                requestJson[i].url = '/my-requests'
                            }
                        }
                        result.request = requestJson
                    } catch (error) {
                        console.error(error)
                    }
                }
                if (filter.includes('estimation')) {
                    try {
                        const estimation = await Estimation.findAll({
                            include:
                                [
                                    {
                                        model: ReqAgency,
                                        where: {
                                            [Op.or]: [{ AgencyId: associatedId }, { CompanyId: associatedId }]
                                        },
                                        include:
                                            [
                                                {
                                                    model: Request,
                                                    where: reqCondition
                                                }
                                            ]
                                    },
                                    {
                                        model: Task,
                                        include: {
                                            model: Employee,
                                            through: false
                                        }
                                    }
                                ],
                        });
                        console.log(estimation)
                        var estimationJson = estimation.map(o => o.toJSON());
                        for (var i = 0; i < estimationJson.length; i++) {
                            if (thisUser.type === 2) {
                                estimationJson[i].url = '/edit-estimation/' + estimationJson[i].ReqAgency.RequestId
                            } else {
                                estimationJson[i].url = '/request/' + estimationJson[i].ReqAgency.RequestId + '/agency/' + estimationJson[i].ReqAgency.AgencyId + '/estimation'
                            }
                        }
                        for(var i = 0; i < estimationJson.length; i++) {
                            for(var j = 0; j < estimationJson[i].Tasks.length; j++) {
                                for(var k = 0; k < estimationJson[i].Tasks[j].Employees.length; k++) {
                                    estimationJson[i].Tasks[j].Employees[k].url = '/employee/' + estimationJson[i].Tasks[j].Employees[k].id
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
