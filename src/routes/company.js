const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Company } = require('../models/associations')

// get Company by id
router.get('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const company = await Company.findByPk(id)
    res.json(company)
})

router.get('/', async (req, res) => {
    const companies = await Company.findAll()
    res.json(companies)
})

// post new Company
router.post('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const company = await Company.create(req.body)
    res.json(company)
})

// edit new Company
router.put('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const body = req.body
    const updatedCompany = await Company.update(body, {
        where: {
            id: id
        }
    })
    const update = await Company.findByPk(id)
    res.json(update)
})

// delete Company
router.delete('/:id(\\d+)', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const id = req.params.id
    const message = await Company.destroy({
        where : {
            id: id
        }
    })
    res.json(message)
})

module.exports = router