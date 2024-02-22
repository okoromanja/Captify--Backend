require("dotenv").config()
const express = require("express");
const http = require("http");
const axios = require('axios');
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors")
const moment = require("moment");
const serviceAccount = require("./serviceAccountKey.json");
const { assert } = require("console");


// ///////////////////////////////////////////////////////////////////////////////////////


const app = express();


app.use(express.static("public"));

app.use(express.json());
app.use(bodyParser.json());
app.use(
  cors({
    origin: `${process.env.HOST_URL}`
  })
)

app.get('/token', async (req, res) => {
  try {
    const response = await axios.post('https://api.assemblyai.com/v2/realtime/token',
      { expires_in: 3600 },
      { headers: { authorization: `${process.env.AAI_KEY}` } });
    const { data } = response;
    res.json(data);
  } catch (error) {
    const { response: { status, data } } = error;
    res.status(status).json(data);
  }
});

app.set('port', 8000);
const server = app.listen(app.get('port'), () => {
  console.log(`Server is running on port ${server.address().port}`);
});

// //////////////////////////////////////////////////////////////////////////////////////////////////





app.get("/", (req, res) => {
  res.send("Hello world")
})

const [basic, pro, business] = ["price_1OknB4GjRSLCL52uZbVbapOU", "price_1Ok0R5GjRSLCL52uUfuuIwMc", "price_1Ok0RuGjRSLCL52ufBxjtq1L"]

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);




const stripeSession = async (plan) => {
  try {

    const session = stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan,
          quantity: 1
        }
      ],
      success_url: `${process.env.HOST_URL}/success`,
      cancel_url: `${process.env.HOST_URL}/cancel`

    })
    return session
  } catch (error) {
    console.log("Error from sessionsStripe function", error)
    return error
  }
}

app.post("/subscriptions", async (req, res) => {
  const { plan, customerId } = req.body;
  console.log(req.body);
  let planId = null;

  if (plan == 10) {
    planId = basic
  }
  else if (plan == 20) {
    planId = pro
  } else if (plan == 30) {
    planId = business
  }

  try {
    const session = await stripeSession(planId);
    const user = await admin.auth().getUser(customerId);

    await admin.database().ref("users").child(user.uid).update({
      subscription: {
        sessionId: session.id
      }

    })

    console.log("session from  post request", session);
    return res.json({ session });

  } catch (error) {
    res.send(error)
    console.log("Error during post request of stripe")
  }

})


/************ payment success ********/

app.post("/payment-success", async (req, res) => {
  const { sessionId, firebaseId } = req.body;


  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const subscriptionId = session.subscription;
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const user = await admin.auth().getUser(firebaseId);
        const planId = subscription.plan.id;
        const planType = subscription.plan.amount === 1000 ? "basic" : "pro";
        const startDate = moment.unix(subscription.current_period_start).format('YYYY-MM-DD');
        const endDate = moment.unix(subscription.current_period_end).format('YYYY-MM-DD');
        const durationInSeconds = subscription.current_period_end - subscription.current_period_start;
        const durationInDays = moment.duration(durationInSeconds, 'seconds').asDays();
        await admin.database().ref("users").child(user.uid).update({
          subscription: {
            sessionId: null,
            planId: planId,
            planType: planType,
            planStartDate: startDate,
            planEndDate: endDate,
            planDuration: durationInDays
          }
        });


      } catch (error) {
        console.error('Error retrieving subscription:', error);
      }
      return res.json({ message: "Payment successful" });
    } else {
      return res.json({ message: "Payment failed" });
    }
  } catch (error) {
    res.send(error);
  }
});





admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://captify-93701-default-rtdb.firebaseio.com"
});



