const Agency = require('./agency')
const Comment = require('./comment')
const Company = require('./company')
const Employee = require('./employee')
const Estimation = require('./estimation')
const Payment = require('./payment')
const PaymentHistory = require('./payment_history')
const RequestTask = require('./reqtask')
const Request = require('./request')
const Tag = require('./tag')
const Task = require('./task')
const TaskTag = require('./tasktag')
const Review = require('./review')
const ReqAgency = require('./req_agency')
const { DataTypes } = require("sequelize")
const sequelize = require('../db/db');
const User = require('../models/user')(sequelize, DataTypes)
// associations


User.hasMany(Comment)
Comment.belongsTo(User)

// an agency can have many tags, and a tag can be shared
// by many agencies. Many to many relationship between
// Agency and Tag through table called AgencyTags.
Agency.belongsToMany(Tag, {through: 'AgencyTags'})
Tag.belongsToMany(Agency, {through: 'AgencyTags'})

// an agency can receive many requests. a request can be sent 
// to many agencies. Many to many relationships between 
// Agency and Request. Implemented as supermanytomany.
Agency.belongsToMany(Request, {through: ReqAgency})
Request.belongsToMany(Agency, {through: ReqAgency})
Agency.hasMany(ReqAgency)
ReqAgency.belongsTo(Agency)
Request.hasMany(ReqAgency)
ReqAgency.belongsTo(Request)

// a reqagency relationship might have an estimation attached
// with it. an estimation must be attached to a reqagency
// relationship.
ReqAgency.hasOne(Estimation, {
    onDelete: 'CASCADE'
})
Estimation.belongsTo(ReqAgency)

// a company can make many requests. a request must be made
// by one company. One to many relationship between 
// Company and ReqAgency
Company.hasMany(ReqAgency)
ReqAgency.belongsTo(Company)

// a request can have many reqtasks. a reqtask will only belong
// to one request. One to many relationship between
// Request and RequestTask
Request.hasMany(RequestTask)
RequestTask.belongsTo(Request)

// an agency can have many employees. an employee will only belong
// to one agency. One to many relationship between 
// Agency and Employee
Agency.hasMany(Employee)
Employee.belongsTo(Agency)

// an estimation can have many tasks. a task will only belong to 
// one estimation. One to many relationship between 
// Estimation and Task
Estimation.hasMany(Task, {
    onDelete: 'CASCADE'
})
Task.belongsTo(Estimation)

// a reqagency can have many comments. a comment will only belong 
// to one reqagency. One to many relationship between
//  ReqAgency and Comment
ReqAgency.hasMany(Comment)
Comment.belongsTo(ReqAgency)

// a comment can be liked by many users. a user can like many comments.
// Many to many relationship between user and comment through table
// called UserLikes.
User.belongsToMany(Comment, {
    through: 'UserLike', as: 'Likes'
})

Comment.belongsToMany(User, {
    through: 'UserLike', as: 'Likes'
})

// self referencing relationship between comment and comment
Comment.belongsToMany(Comment, {
    as: 'Replies',
    through: 'CommentReplies',
})

// a comment can be made by an user. an user can make many comments. 
// one to many relationship between user and comment.

// an employee will have many tasks. a task can be delegated to 
// many employees. Many to many relationship between 
// Employee and Task through EmployeeTasks
Employee.belongsToMany(Task, {through: 'EmployeeTasks'})
Task.belongsToMany(Employee, {through: 'EmployeeTasks'})

// a task will have many task tags. a task tag can be shared by
// multiple tasks. Many to many relationship between 
// Task and TaskTag
Task.belongsToMany(TaskTag, {through: 'TaskTaskTags'})
TaskTag.belongsToMany(Task, {through: 'TaskTaskTags'})

// a review will be made for a particular reqagency. a reqagency
// will have one review. One to one relationship between
// ReqAgency and Review
ReqAgency.hasOne(Review)
Review.belongsTo(ReqAgency)

// a company can make many transactions. But a transaction will
// always be made by one company. One to many relationship between
// Company and Payment.
Company.hasMany(Payment)
Payment.belongsTo(Company)

// an agency can recieve many payments. But a transaction will
// always be made to only one agency. One to many relationship between
// Agency and Payment.
Agency.hasMany(Payment)
Payment.belongsTo(Agency)

// an estimation can recieve only one payment. And a payment will
// always be made for only one estimation. One to One relationship between
// Estimation and Payment.
Estimation.hasOne(Payment)
Payment.belongsTo(Estimation)

// a payment can have many payment histories. But a payment history will
// always be made for only one payment. One to many relationship between
// Payment and PaymentHistory.
Payment.hasMany(PaymentHistory, {
    onDelete: 'CASCADE'
})
PaymentHistory.belongsTo(Payment)

// an estimation can have many tags. a tag can be shared by many estimations.
// Many to many relationship between Estimation and Tag
Estimation.belongsToMany(Tag, {through: 'EstimationTags'})
Tag.belongsToMany(Estimation, {through: 'EstimationTags'})

module.exports = { Agency, Comment, Company, Employee, Estimation, Payment, PaymentHistory, RequestTask, Request, Tag, Task, TaskTag, Review, ReqAgency, User }