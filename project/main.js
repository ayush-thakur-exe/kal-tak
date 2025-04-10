require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')

// Setup and middlewear
app.use(express.static('public'))
app.use(bodyParser.urlencoded())
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }))

