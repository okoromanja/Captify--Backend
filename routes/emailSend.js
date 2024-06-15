const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const admin = require("../firebase");
const nodemailer = require("nodemailer")




const transporter = nodemailer.createTransport({
    service: 'Gmail',

    auth: {
        user: 'my email address',
        pass: 'my password'
    }
})
















module.exports = router
