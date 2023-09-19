const express = require('express')
const router = express.Router()
const { decodeToken } = require('../utils/helper')
const passport = require('passport')
const { Task } = require('../models/associations')

router.put('/:id/link', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const link = req.body.link
    // update the sample_link 
    const task = await Task.findByPk(id)
    await task.update({
        sample_link: link
    })
    res.json({"message": "link updated"})
})

module.exports = router