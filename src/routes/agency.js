const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency } = require('../models/associations')

router.get('/', async (req, res) => {
    const agencies = await Agency.findAll()
    agencies.forEach(agency => {
        agency.dataValues.key = agency.name
        agency.dataValues.value = agency.id
        agency.dataValues.text = agency.name
        agency.dataValues.details = agency.dataValues.description
        // remove description from dataValues
        delete agency.dataValues.description
    })
    res.json(agencies)
})

// get agency by id
router.get('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const agency = await Agency.findByPk(id)
    res.json(agency)
})

// post new agency
router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const agency = await Agency.create(req.body)
    res.json(agency)
})

// edit new agency
router.put('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const body = req.body
    const update = await Agency.update(body, {
        where: {
            id: id
        }
    })
    const updatedAgency = await Agency.findByPk(id)
    res.json(updatedAgency)
})

// delete agency
router.delete('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const message = await Agency.destroy({
        where : {
            id: id
        }
    })
    res.json(message)
})

module.exports = router