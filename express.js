const express = require('express')
const app = express()
const { createServer } = require('node:http');
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3002',
    }
});

module.exports = { app, server, io }