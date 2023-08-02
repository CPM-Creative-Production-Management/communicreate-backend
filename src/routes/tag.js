const express = require('express')
const router = express.Router()
const { Tag } = require('../models/associations')

router.post('/create', async (req, res) => {
    const tag = req.body.tag

    await Tag.create({
        tag: tag
    })

    res.json(
        {
            responseCode: 1,
            message: 'Tag created'
        })

})

router.get('/all', async (req, res) => {
    const tags = await Tag.findAll()
    res.json({
        responseCode: 1,
        tags: tags
    })
})

// update tag
router.put('/:id(\\d+)', async (req, res) => {
    const id = req.params.id
    const body = req.body
    const update = await Tag.update(body, {
        where: {
            id: id
        }
    })
    const updatedTag = await Tag.findByPk(id)
    res.json(updatedTag)
})

// delete tag
router.delete('/:id(\\d+)', async (req, res) => {
    const id = req.params.id
    const message = await Tag.destroy({
        where : {
            id: id
        }
    })
    res.json(message)
})

module.exports = router