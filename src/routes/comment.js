const express = require('express');
const router = express.Router();
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Request, ReqAgency, Company, RequestTask, Estimation, Task, TaskTag, Tag, Employee, User, Comment } = require('../models/associations')
const { getCommentsRecursive } = require('../utils/helper')

router.post('/:id(\\d+)/reply', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    try {
        const user = await User.findOne({ where: { email: decodedToken.email } })
        const comment = await Comment.findOne({ where: { id: req.params.id } })
        const reply = await Comment.create({
            body: req.body.body,
            level: comment.dataValues.level + 1,
        })
        const reqAgency = await comment.getReqAgency()
        await reply.setUser(user)
        await reply.setReqAgency(reqAgency)

        // const updatedReply = await Comment.findOne({ where: { id: reply.id }, 
        //     include: {
        //         model: User,
        //         attributes: { exclude: ['password', 'username', 'id']},
        //     }
            
        // })

        
        

        await comment.addReply(reply)

        // send the full comment list as response
        const allComments = await Comment.findAll({
            where: {
                ReqAgencyId: reqAgency.id,
                level: 0
            },
            include: {
                model: User,
                attributes: { exclude: ['password', 'username', 'id']},
            },
            // sort by createdAt
            order: [['createdAt', 'ASC']]
        })

        for (let i = 0; i < allComments.length; i++) {
            const comment = allComments[i]
            await getCommentsRecursive(comment)
        }

        res.status(200).json({ 
            message: 'reply created successfully',
            
            comments: allComments
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'internal server error' })
    }
})

// like a comment
// comment and user have many to many relationship through table called UserLike
router.post('/:id(\\d+)/like', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    try {
        const user = await User.findOne({ where: { email: decodedToken.email } })
        const comment = await Comment.findOne({ where: { id: req.params.id } })
        const liked = await comment.hasLike(user)
        if (liked) {
            return res.status(400).json({ message: 'comment already liked' })
        }
        await comment.addLike(user)
        res.json({ message: 'comment liked successfully' })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'internal server error' })
    }
})

// unlike a comment
// comment and user have many to many relationship through table called UserLike
router.post('/:id(\\d+)/unlike', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const decodedToken = decodeToken(req)
    try {
        const user = await User.findOne({ where: { email: decodedToken.email } })
        const comment = await Comment.findOne({ where: { id: req.params.id } })
        const liked = await comment.hasLike(user)
        if (!liked) {
            return res.status(400).json({ message: 'comment not liked' })
        }
        await comment.removeLike(user)
        res.json({ message: 'comment unliked successfully' })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'internal server error' })
    }
})

module.exports = router