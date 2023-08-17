const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Tag } = require('../models/associations')

router.get('/', async (req, res) => {
    const agencies = await Agency.findAll({
        include: Tag
    })
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

router.put('/:id(\\d+)/settags', async (req, res) => {
    const id = req.params.id
    const tags = req.body.tags
    const agency = await Agency.findByPk(id)
    await agency.setTags([])
    for (let i = 0; i < tags.length; i++) {
        const id = tags[i];
        const tag = await Tag.findByPk(id)
        await agency.addTag(tag)
    }
    res.status(200).json({message: 'success'})
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