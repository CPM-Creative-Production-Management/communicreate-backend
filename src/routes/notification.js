const express = require('express')
const router = express.Router()
const passport = require('passport')
const { decodeToken } = require('../utils/helper')
const { Notification, User, Agency, Company } = require('../models/associations')
const notificationUtils = require('../utils/notification')

// development only
// create notification for user
router.post('/user/:id', async (req, res) => {
    const userId = req.params.id
    const notification = await notificationUtils.sendNotification(userId, req.body.message, req.body.link)
    res.json(notification)
})

// create notification for company
router.post('/company/:id', async (req, res) => {
    const companyId = req.params.id
    const notification = await notificationUtils.sendCompanyNotification(companyId, req.body.message, req.body.link)
    res.json(notification)
})

// create notification for agency
router.post('/agency/:id', async (req, res) => {
    const agencyId = req.params.id
    const notification = await notificationUtils.sendAgencyNotification(agencyId, req.body.message, req.body.link)
    res.json(notification)
})

// get all notifications for user
router.get('/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const decodedToken = decodeToken(req)
    const user = await User.findOne({where: {email: decodedToken.email}})
    const notificationObjects = await user.getNotifications()
    // mark all notifications as read
    for (let i = 0; i < notificationObjects.length; i++) {
        await user.addNotification(notificationObjects[i], {through: {read: true}})
    }
    // sort notifications by date
    notificationObjects.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt)
    })
    const notifications = []
    for (let i = 0; i < notificationObjects.length; i++) {
        const notification = notificationObjects[i]
        const notificationObject = {
            id: notification.id,
            message: notification.message,
            link: notification.link,
            read: notification.UserNotifications.read,
            createdAt: notification.createdAt,
            type: notification.type
        }
        notifications.push(notificationObject)
    }
    // pagination
    if (req.query.page) {
        const page = parseInt(req.query.page)
        const limit = 10
        const offset = (page - 1) * limit
        const paginatedNotifications = notifications.slice(offset, offset + limit)
        const totalPages = Math.ceil(notifications.length / limit)
        // next page
        let nextPage = null
        if (page < totalPages) {
            nextPage = page + 1
        }
        // previous page
        let previousPage = null
        if (page > 1) {
            previousPage = page - 1
        }
        res.json({
            notifications: paginatedNotifications,
            nextPage: nextPage,
            previousPage: previousPage,
            totalPages: totalPages
        })
    } else {
        res.json({
            notifications: notifications,
            nextPage: null,
            previousPage: null,
            totalPages: 1
        })
    }
})

module.exports = router