const express = require('express')
const router = express.Router()
const { TaskTag } = require('../models/associations')

router.post('/', async (req, res) => {
    const name = req.body.name

    await TaskTag.create({
        name: name
    })

    res.json(
        {
            responseCode: 1,
            message: 'taskTag created'
        })

})

router.get('/', async (req, res) => {
    const tasktags = await TaskTag.findAll()
    res.json({
        responseCode: 1,
        name: tasktags
    })
})

// update tasktag
router.put('/:id(\\d+)', async (req, res) => {
    const id = req.params.id
    const body = req.body
    const update = await TaskTag.update(body, {
        where: {
            id: id
        }
    })
    const updatedtaskTag = await TaskTag.findByPk(id)
    res.json(updatedtaskTag)
})

// delete tasktag
router.delete('/:id(\\d+)', async (req, res) => {
    const id = req.params.id
    const message = await TaskTag.destroy({
        where : {
            id: id
        }
    })
    res.json(message)
})

module.exports = router