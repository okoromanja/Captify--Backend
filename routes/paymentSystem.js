const express = require('express')
const router = express.Router();
const bodyParser = require("body-parser");
const moment = require("moment")
const admin = require('../firebase')

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);




router.use(bodyParser.json({ limit: '3000mb' }));
router.use(bodyParser.urlencoded({ limit: '3000mb', extended: true }));




// Api to charge the user for transcriptions in direct way

router.post('/create-stripe-session', async (req, res) => {
    const { cost, cloudUrl, userId, filename, fileDuration, transcriptUrl, transcriptFileName } = req.body;

    console.log("is credit method  and cost:", cost)
    try {


        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Audio Transcription',
                        description: `Transcription of file`,
                    },
                    unit_amount: Math.round(cost * 100), // Convert to cents
                },
                quantity: 1,
            }],

            mode: 'payment',
            success_url: `${process.env.HOST_URL}/transcript-payment-success`,
            cancel_url: `${process.env.HOST_URL}/cancel`
        });


        // Prepare the data to be updated
        const updateData = {
            transcriptionsSessionId: session.id,
            dataDetails: {
                cloudUrl: cloudUrl,
                transcriptUrl: transcriptUrl ? transcriptUrl : "noUrl",
                amount: cost,
                filename: filename,
                fileDuration: fileDuration,
                transcriptFileName: transcriptFileName ?  transcriptFileName : "noTranscriptFileName",

                method: "Direct Payment"
            }
        };


        // Store session ID and other details in Firebase
        await admin.database().ref(`users/${userId}/transcript-payment`).update(updateData);

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating Stripe session", error);
        res.status(500).send('Internal Server Error');
    }
});


// Api to ensure session, wheather user pay the amount or not
router.post("/retrieve", async (req, res) => {
    const { sessionId } = req.body;
    console.log("sessionId in request body", req.body)

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {


            return res.json({ message: "Payment successful" });
        } else {
            return res.json({ message: "Payment failed" });
        }
    } catch (error) {
        res.send(error);
    }
});





// Api to buy the credit

router.post('/buy-credit', async (req, res) => {


    const { total, method, userBalance, userId } = req.body;

    console.log("is credit method  and cost:", method, total, userBalance)
    try {


        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Audio Transcription',
                        description: `Transcription of file`,
                    },
                    unit_amount: Math.round(total * 100), // Convert to cents
                },
                quantity: 1,
            }],

            mode: 'payment',
            success_url: `${process.env.HOST_URL}/credit-payment-success`,
            cancel_url: `${process.env.HOST_URL}/cancel`
        });


        // Prepare the data to be updated
        const updateData = {
            transcriptionsSessionId: session.id,
            total: total,
            userBalance: userBalance,
            method: method,
            status: "unpaid"

        };


        // Store session ID and other details in Firebase
        await admin.database().ref(`users/${userId}/credit-payment`).update(updateData);

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating Stripe session", error);
        res.status(500).send('Internal Server Error');
    }
});









// Api to charge use for live transcript 



router.post('/live-transcript-payment', async (req, res) => {
    const { total, userId, minutes } = req.body;


    try {


        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Live Transcriptions',
                        description: `Time duration for real time transcriptions`,
                    },
                    unit_amount: Math.round(total * 100), // Convert to cents
                },
                quantity: 1,
            }],

            mode: 'payment',
            success_url: `${process.env.HOST_URL}/live-transcript-payment-success`,
            cancel_url: `${process.env.HOST_URL}/cancel`
        });


        // Prepare the data to be updated
        const updateData = {
            transcriptionsSessionId: session.id,

            price: total,
            minutes: minutes,
            method: "Live Transcript Direct Pay",
            status: "unPaid"

        };


        // Store session ID and other details in Firebase
        await admin.database().ref(`users/${userId}/live-transcript-payment`).update(updateData);

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating Stripe session", error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router