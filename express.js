const express = require('express')
const app = express()
const { createServer } = require('node:http');
const { Server } = require("socket.io");
require('dotenv').config()

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://communicreate.onrender.com',
        methods: ["GET", "POST"]
    }
});

module.exports = { app, server, io }