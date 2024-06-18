require("dotenv").config()
const express = require("express");

const axios = require('axios');
const admin = require('./firebase');
const bodyParser = require("body-parser");
const cors = require("cors")
const moment = require("moment");
const connectToMongo = require('./db')
const WebSocket = require('ws');




// ///////////////////////////////////////////////////////////////////////////////////////


const app = express();


app.use(express.static("public"));


app.use(bodyParser.json({ limit: '3000mb' }));
app.use(bodyParser.urlencoded({ limit: '3000mb', extended: true, parameterLimit: 50000 }));


const allowedOrigins = [
  process.env.HOST_URL,
  process.env.HOST_URL_ADMIN
];

const corsOptions = {
  origin: (origin, callback) => {
    // Check if the incoming origin is in the allowed origins list
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true  // If you need to support cookies or authorization headers
};

app.use(cors(corsOptions));


app.set('port', 8000);
const server = app.listen(app.get('port'), () => {
  console.log(`Server is running on port ${server.address().port}`);
});


app.use('/api/save', require("./routes/route"))
app.use('/emails', require("./routes/emailSend"))
app.use('/sync', require("./routes/syncRoutes"))
app.use('/payment-system', require("./routes/paymentSystem"))
app.use('/admin', require("./adminRoutes/auth"))
app.use('/admin-payments', require("./adminRoutes/paymentHandling"))






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


connectToMongo()




const wss = new WebSocket.Server({ server });

wss.on("connection", () => {
  console.log("client connected")
})


// Define the webhook handler on your server
app.post('/hook', (req, res) => {
  try {
    const jobDetails = req.body.job;
    console.log("request body from webhook", jobDetails);

    if (jobDetails) {
      wss.clients.forEach(client => {

        client.send(JSON.stringify(jobDetails))

      })

      // Respond with a 200 status to acknowledge receipt of webhook
      res.sendStatus(200);
    }
    // Send notification to all connected WebSocket clients



  } catch (error) {
    console.log("Error while sending notification to clientside", error)
  }

});


// //////////////////////////////////////////////////////////////////////////////////////////////////





app.get("/", (req, res) => {
  res.send("Hello world")
})

const [basic, pro, business] = ["price_1OuZ0QGjRSLCL52upDZMDW54", "price_1OuZ4nGjRSLCL52uTnungZPz", "price_1OuZ3dGjRSLCL52u7tXx7nOG"]

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

  if (plan === "basic") {
    planId = basic
  }
  else if (plan === "pro") {
    planId = pro
  } else if (plan === "business") {
    planId = business
  }

  try {
    const session = await stripeSession(planId);
    console.log("session from  post request", session);
    const user = await admin.auth().getUser(customerId);



    await admin.database().ref("users").child(user.uid).update({
      subscription: {
        sessionId: session.id
      }

    })


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
        const planAmount = subscription.plan.amount
        console.log("required plan amount:", subscription.plan.amount)
        const planType = subscription.plan.amount === 1000 ? "pro" : subscription.plan.amount === 2000 ? "business" : "free trial";
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
            planDuration: durationInDays,
            planPrice: planAmount/100
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

app.get('/share/transcript', (req, res) => {
  // Extract transcript text from URL query parameter
  const transcriptText = req.query.text;
  console.log("transcriptText for link:   ", transcriptText)

  // Generate the shareable link
  const baseUrl = 'http://localhost:8000'; // Replace with your server base URL
  const transcriptLink = `${baseUrl}/transcript?text=${encodeURIComponent(transcriptText)}`;

  // Send the link back to the client
  res.send(transcriptLink);
});

app.get('/transcript', (req, res) => {
  const transcriptText = req.query.text;


  // Render HTML page with transcript text
  res.send(`
    <html>
      <head>
        <title>Transcript</title>
      </head>
      <body>
        <h1>Transcript</h1>
        <p>${decodeURIComponent(transcriptText)}</p>
      </body>
    </html>
  `);
});





// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://captify-93701-default-rtdb.firebaseio.com"
// });



module.exports = server; // Export the server instance