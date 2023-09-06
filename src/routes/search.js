const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Request, Company, Agency, ReqAgency, Tag, Estimation } = require('../models/associations')
const { Op } = require('sequelize');

// search for a company by its name or any substring of its name
router.get('/company/:keyword', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const { keyword } = req.params;
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
router.get('/agency/:keyword', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const { keyword } = req.params;
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
router.get('/request/:keyword', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const associatedId = decodedToken.associatedId;
        const { keyword } = req.params;

        const request = await Request.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${keyword}%`
                }
            },
            include: [
                {
                    model: ReqAgency,
                    where: {
                        [Op.or]: [{AgencyId: associatedId}, {CompanyId: associatedId}]
                    },
                },
            ],
        })
        res.json(request)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

// search for an estimation by its tag
router.get('/tag/:keyword', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const decodedToken = decodeToken(req)
        const associatedId = decodedToken.associatedId
        const { keyword } = req.params;

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
                                [Op.or]: [{AgencyId: associatedId}, {CompanyId: associatedId}]
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
