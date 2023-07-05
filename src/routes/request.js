const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Agency, Request, ReqAgency, Company, RequestTask } = require('../models/associations')

const requestGetter = async (accepted, finalized, associatedId) => {
    const reply = await Agency.findByPk(associatedId, {
        include: [
            {
                model: ReqAgency,
                where: {
                    accepted: accepted,
                    finalized: finalized,
                },
                include: [{
                    model: Request,
                    include: RequestTask
                }, Company],
                attributes: {
                    exclude: ['id', 'accepted', 'finalized',]
                }
            }
    ],
    })
    return reply
}
// get a list of all the pending requests
router.get('/pending', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    try {
        const agencies = await requestGetter(false, false, associatedId)
        if (agencies === null) {
            res.json([])
        } else {res.json(agencies.ReqAgencies)}
    } catch (err) {
        console.error(err)
    }
})

// get a list of waiting requests
router.get('/accepted', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    try {
        const agencies = await requestGetter(true, false, associatedId)
        if (agencies === null) {
            res.json([])
        } else {res.json(agencies.ReqAgencies)}
    } catch (err) {
        console.error(err)
    }
})

// get a list of accepted requests
router.get('/finalized', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    try {
        const agencies = await requestGetter(true, true, associatedId)
        if (agencies === null) {
            res.json([])
        } else {res.json(agencies.ReqAgencies)}
    } catch (err) {
        console.error(err)
    }
})


// get a particular request
router.get('/:id', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    try {
        const request = await Request.findByPk(id)
        res.json(request)
    } catch (err) {
        console.error(err)
    }
})

// accept a particular request
router.post('/:id/accept', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    try {
        const request = await Request.findByPk(id, {
            include: {
                model: ReqAgency,
                where: {
                    AgencyId: associatedId,
                    accepted: false
                }
            }
        })
        if (request.ReqAgencies[0] !== null) {
            request.ReqAgencies[0].accepted = true
            request.ReqAgencies[0].save()
            res.json(request)
        }
        else {
            res.json({ message: "already accepted"})
        }
    } catch (err) {
        console.error(err)
    }
})

// reject a particular request
router.post('/:id/reject', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const id = req.params.id
    const decodedToken = decodeToken(req)
    const associatedId = decodedToken.associatedId;
    try {
        const request = await Request.findByPk(id, {
            include: {
                model: ReqAgency,
                where: {
                    AgencyId: associatedId
                }
            }
        })
        if (request !== null) {
            if (request.ReqAgencies[0] !== null) {
                const pk = request.ReqAgencies[0].id
                await ReqAgency.destroy({
                    where: {
                        id: pk
                    }
                })
                res.json({message: "request removed successfully"})
            }
        }
        else {
            res.json({message: "request unavailable for rejection"})
        }
    } catch (err) {
        console.error(err)
    }
})

module.exports = router