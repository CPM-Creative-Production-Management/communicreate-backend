const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
require('dotenv').config()
const sequelize = require('./src/db/db')
const { DataTypes, ABSTRACT } = require("sequelize")
const User = require('./src/models/user')(sequelize, DataTypes)
const passport = require('passport')
require('./config/passport')
const session = require('express-session')
const jwt = require('jsonwebtoken')
const accountRouter = require('./src/routes/account')
const {Agency, Comment, Company, Employee, Estimation, RequestTask, Request, Tag, Task, TaskTag, Review} = require('./src/models/associations')


//Initializing express
const app = express()

//Express Middleware
app.use(bodyParser.json())
app.use(morgan('dev'))
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized:true}));
app.use(passport.initialize())
app.use(passport.session())
app.use('/account', accountRouter)


//Route
app.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    if (req.isAuthenticated()) {
        res.send('hello')
    }
})

app.get('/employees/', passport.authenticate('jwt', {session: false}), async (req, res) => {
    const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    // Use the bearer token as needed
    try {
        const decodedToken = jwt.verify(bearerToken, 'catto');
        console.log(decodedToken)
        // Access the payload data
        const username = decodedToken.username;
        const associatedId = decodedToken.associatedId;
        const agency = await Agency.findByPk(associatedId)
        const employeeList = await agency.getEmployees()
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(employeeList, null, 2))
        // Use the extracted information
      } catch (error) {
        console.error('Invalid token:', error.message);
        res.send('Did not work')
      }
  }
})

app.listen(process.env.PORT, async () => {
    console.log(`Example app listening at http://localhost:${process.env.PORT}`)
    try{
        await sequelize.sync(
        )
        console.log("Database in sync with models. Clear to proceed.")
        const agency = await Agency.findByPk(1)
        const employees = await agency.getEmployees()
        console.log(employees)
    }catch(error){
        console.error(`Error: ${error}`)
    }
})