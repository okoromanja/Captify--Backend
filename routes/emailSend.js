const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const admin = require("../firebase");
const nodemailer = require("nodemailer")



// Nodemailer setup 
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  port: process.env.NODEMAILER_PORT,
  secure: process.env.NODEMAILER_SECURE,

  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS
  }
})



// function to send the email verification
const sendVerificationEmail = async (email) => {
  const actionCodeSettings = {
    url: `${process.env.HOST_URL}/emailverification`,
    handleCodeInApp: true,
  };

  try {
    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    const mailOptions = {
      from: process.env.NODEMAILER_USER,
      to: email,
      subject: 'Verify your email for MyApp',
      text: `Please verify your email by clicking on the following link: ${link}`,
      html: `<p>Please verify your email by clicking on the following link: <a href="${link}">Verify Email</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification email sent');
  } catch (error) {
    console.error('Error sending email verification link:', error);
  }
};


// Api to send that email through sendVerificationEmail() fucntion


router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  console.log("req body", req.body)
  console.log("email, password, name", email, password, name)

  try {

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,

    });

    console.log("users record", userRecord.email)

    // Update the user's profile to set the display name
    await admin.auth().updateUser(userRecord.uid, {
      displayName: name
    });

    await admin.database().ref(`users/${userRecord.uid}`).set({
      email: email,
      name: name
    })


    await sendVerificationEmail(userRecord.email);



    res.status(201).send({ message: 'User signed up. Verification email sent.' });
  } catch (error) {
    console.log('Error while signup', error)
    res.status(400).send({ error });
  }
});















module.exports = router
