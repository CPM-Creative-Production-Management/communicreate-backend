const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
require('dotenv').config()
const sequelize = require('./src/db/db')
const schedule = require('./src/utils/cron')
const { DataTypes, ABSTRACT } = require("sequelize")
const { createServer } = require('node:http');
const cors = require('cors')
// const User = require('./src/models/user')(sequelize, DataTypes)
const passport = require('passport')
require('./config/passport')
const session = require('express-session')
const jwt = require('jsonwebtoken')
const adminRouter = require('./src/routes/admin')
const accountRouter = require('./src/routes/account')
const generalRouter = require('./src/routes/general')
const employeeRouter = require('./src/routes/employee')
const requestRouter = require('./src/routes/request')
const estimationRouter = require('./src/routes/estimation')
const agencyRouter = require('./src/routes/agency')
const companyRouter = require('./src/routes/company')
// const paymentRouter = require('./src/routes/payment')
const paymentRouter = require('./src/routes/payment_new')
const tagRouter = require('./src/routes/tag')
const taskTagRouter = require('./src/routes/taskTag')
const commentRouter = require('./src/routes/comment')
const dashboardRouter = require('./src/routes/dashboard')
const notificationRouter =  require('./src/routes/notification')
const searchRouter = require('./src/routes/search')
const { Op } = require("sequelize");
const {Agency, Comment, Company, Employee, Estimation, Payment, PaymentHistory, RequestTask, Request, Tag, Task, TaskTag, Review, ReqAgency, User, Notification} = require('./src/models/associations')

//Initializing express
const app = express()


app.use(cors())

// socket
const { Server } = require("socket.io");
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3002',
    }
});

//Express Middleware
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'))
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized:true}));
app.use(passport.initialize())
app.use(passport.session())

// Routers
app.use('/admin', adminRouter)
app.use('/account', accountRouter)
app.use('/', generalRouter)
app.use('/employee', employeeRouter)
app.use('/request', requestRouter)
app.use('/estimation', estimationRouter)
app.use('/agency', agencyRouter)
app.use('/company', companyRouter)
app.use('/payment', paymentRouter)
app.use('/tag', tagRouter)
app.use('/tasktag', taskTagRouter)
app.use('/dashboard', dashboardRouter)
app.use('/comment', commentRouter)
app.use('/notification', notificationRouter)
app.use('/search', searchRouter)

//Route
app.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    if (req.isAuthenticated()) {
        res.send('hello')
    }
    else{
        res.send('not authenticated')
    }
})

//Socket
io.on('connection', (socket) => {
    console.log('a user connected', socket.id)
    socket.on('join', (data) => {
        console.log(data)
    })
})

server.listen(process.env.PORT, async () => {
    console.log(`Example app listening at http://localhost:${process.env.PORT}`)
    try{
        await sequelize.sync(
            // {alter: true}
        )
        // await Notification.sync({
        //     alter: true
        // })
        // console.log(typeof(x[0]))
        console.log("Database in sync with models. Clear to proceed.")
    }catch(error){
        console.error(`Error: ${error}`)
    }
})