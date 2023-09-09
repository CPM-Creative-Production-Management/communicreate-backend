// notification helper functions
const {Notification, Company, Agency} = require('../models/associations')
const {User} = require('../models/associations')

// send notification to a user
const sendNotification = async (userId, message, link, type) => {
    const user = await User.findByPk(userId)
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    await user.addNotification(notification)
    return notification
}

// send notification to a company
const sendCompanyNotification = async (companyId, message, link, type) => {
    const company = await Company.findByPk(companyId)
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    const users = await company.getUsers()
    for (let i = 0; i < users.length; i++) {
        await users[i].addNotification(notification)
    }
    return notification
}

// send notification to an agency
const sendAgencyNotification = async (agencyId, message, link, type) => {
    const agency = await Agency.findByPk(agencyId)
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    const users = await agency.getUsers()
    for (let i = 0; i < users.length; i++) {
        await users[i].addNotification(notification)
    }
    return notification
}

// send notification to all users
const sendAllNotification = async (message, link, type) => {
    const users = await User.findAll()
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    for (let i = 0; i < users.length; i++) {
        await users[i].addNotification(notification)
    }
    return notification
}

// send notification to all companies
const sendAllCompanyNotification = async (message, link, type) => {
    const companies = await Company.findAll()
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    for (let i = 0; i < companies.length; i++) {
        const users = await companies[i].getUsers()
        for (let j = 0; j < users.length; j++) {
            await users[j].addNotification(notification)
        }
    }
    return notification
}

// send notification to all agencies
const sendAllAgencyNotification = async (message, link, type) => {
    const agencies = await Agency.findAll()
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    for (let i = 0; i < agencies.length; i++) {
        const users = await agencies[i].getUsers()
        for (let j = 0; j < users.length; j++) {
            await users[j].addNotification(notification)
        }
    }
    return notification
}

// send notification to company except one user
const sendCompanyNotificationExcept = async (companyId, userId, message, link, type) => {
    const company = await Company.findByPk(companyId)
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    const users = await company.getUsers()
    for (let i = 0; i < users.length; i++) {
        if (users[i].id !== userId) {
            await users[i].addNotification(notification)
        }
    }
    return notification
}

// send notification to agency except one user
const sendAgencyNotificationExcept = async (agencyId, userId, message, link, type) => {
    const agency = await Agency.findByPk(agencyId)
    const notification = await Notification.create({
        message: message,
        link: link,
        type: type
    })
    const users = await agency.getUsers()
    for (let i = 0; i < users.length; i++) {
        if (users[i].id !== userId) {
            await users[i].addNotification(notification)
        }
    }
    return notification
}

module.exports = {
    sendNotification,
    sendCompanyNotification,
    sendAgencyNotification,
    sendAllNotification,
    sendAllCompanyNotification,
    sendAllAgencyNotification,
    sendCompanyNotificationExcept,
    sendAgencyNotificationExcept
}
