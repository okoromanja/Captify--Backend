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
const sendVerificationEmail = async (email, userId) => {

  try {
    const link = `${process.env.HOST_URL}/emailverification?uid=${userId}`;

    const mailOptions = {
      from: process.env.NODEMAILER_USER,
      to: email,
      subject: 'Verify your email for Captify',
      text: `Please verify your email by clicking on the following link: ${link}`,
      html: `<p>Hi, Thanks for creating the account on captify.</p> <p>Please verify your email by clicking on the following link: <a href="${link}">Verify Email</a></p>`,
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


    await sendVerificationEmail(userRecord.email, userRecord.uid);



    res.status(201).send({ message: 'User signed up. Verification email sent.' });
  } catch (error) {
    console.log('Error while signup', error)
    res.status(400).send({ error });
  }
});




// Api to verify the email manually



router.post('/verify-email', async (req, res) => {
  const { uid } = req.body;

  try {
    await admin.auth().updateUser(uid, { emailVerified: true });
    const customToken = await admin.auth().createCustomToken(uid)

    res.status(200).send({ message: 'Email verified successfully', token: customToken });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(400).send({ error: error.message });
  }
});





// Api to send that email through sendVerificationEmail() fucntion


router.post('/email-verify-login', async (req, res) => {
  const { email }  = req.body;

 
  try {

    const userRecord = await admin.auth().getUserByEmail(email);

    if (userRecord.emailVerified === false) {


      await sendVerificationEmail(userRecord.email, userRecord.uid);
      return res.status(200).send({ message: 'Email not verified. Verification email sent' });
    }

    return res.status(200).send({ message: 'Email verified' });


  } catch (error) {
    console.log('Error while login verify email', error)
    res.status(400).send({ error });
  }
});



module.exports = router
