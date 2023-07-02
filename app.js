const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
require('dotenv').config()
const sequelize = require('./src/db/db')
const { DataTypes } = require("sequelize")
const User = require('./src/models/user')(sequelize, DataTypes)
const passport = require('passport')
require('./config/passport')
const session = require('express-session')
const { createUser } = require('./src/utils/helper')

//Initializing express
const app = express()

//Express Middleware
app.use(bodyParser.json())
app.use(morgan('dev'))
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized:true}));
app.use(passport.initialize())
app.use(passport.session())

//Login Route
app.get('/account/login', passport.authenticate('local'), (req, res) => {
    res.status(200).send({message: 'Logged In Successful'})
});

//Logout Route
app.get('/account/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// signup route
app.post('/account/signup', (req, res, next) => {
    const username = req.body.username
    const password = req.body.password
    const type = req.body.type
    if(createUser(username, password, type)) {
        return res.status(200).json({
            message: 'User successfully created'
        })
    } else {
        return res.status(401).json({
            message: 'User creation unsuccessful'
        })
    }
    
})

// const isAuthenticated = (req,res,next) => {
//     if(req.user)
//        return next();
//     else
//        return res.status(401).json({
//          error: 'User not authenticated'
//        })
// }

// app.use(isAuthenticated)


//Route
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.send({message: 'Hello ' + req.user.get('username')})
    } else {
        res.send('Hello. Login to access features')
    }
    
})

app.listen(process.env.PORT, async () => {
    console.log(`Example app listening at http://localhost:${process.env.PORT}`)
    try{
        await sequelize.sync(
            //{force: true}
        )
        console.log('Connected to database')
    }catch(error){
        console.error(`Error: Cannot connect to database ${error}`)
    }
})