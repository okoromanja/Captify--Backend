require("dotenv").config()
const express = require("express");
const http = require("http");
const path = require("path");
const { AssemblyAI } = require("assemblyai");
const WebSocket = require("ws");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors")
const moment = require("moment");
const serviceAccount = require("./serviceAccountKey.json");
const { assert } = require("console");


// ///////////////////////////////////////////////////////////////////////////////////////

const aai = new AssemblyAI({ apiKey: "ce2c1d53c1af4f02a15b539ffd7bc68c" });
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.use(
  "/assemblyai.js",
  express.static(
    path.join(__dirname, "node_modules/assemblyai/dist/assemblyai.umd.js"),
  ),
);
app.use(express.json());
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:5173"
  })
)

app.get("/token", async (_req, res) => {
  const token = await aai.realtime.createTemporaryToken({ expires_in: 3600 });
  res.json({ token });
});


wss.on("connection", (ws) => {
  let rt;

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    if (data.type === "start") {
      const response = await fetch("/token");
      const tokenData = await response.json();

      if (tokenData.error) {
        ws.send(JSON.stringify({ type: "error", error: tokenData.error }));
        return;
      }

      rt = new AssemblyAI.RealtimeService({ token: tokenData.token });

      rt.on("transcript", (transcriptMessage) => {
        ws.send(JSON.stringify({ type: "transcript", text: transcriptMessage.text }));
      });

      rt.on("error", async (error) => {
        console.error(error);
        await rt.close();
        ws.send(JSON.stringify({ type: "error", error: "RealtimeService error" }));
      });

      rt.on("close", () => {
        rt = null;
      });

      await rt.connect();
    } else if (data.type === "audio") {
      if (rt) {
        rt.sendAudio(Buffer.from(data.audio, "base64"));
      }
    } else if (data.type === "stop") {
      if (rt) {
        await rt.close(false);
        rt = null;
      }
    }
  });

  ws.on("close", () => {
    if (rt) {
      rt.close(false);
    }
  });
});


// //////////////////////////////////////////////////////////////////////////////////////////////////




app.get("/", (req, res) => {
  res.send("Hello world")
})

const [basic, pro, business] = ["price_1Ok0PQGjRSLCL52ubBnCRhLj", "price_1Ok0R5GjRSLCL52uUfuuIwMc", "price_1Ok0RuGjRSLCL52ufBxjtq1L"]

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
      success_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel"

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

  if (plan == 29) {
    planId = basic
  }
  else if (plan == 49) {
    planId = pro
  } else if (plan == 99) {
    planId = business
  }

  try {
    const session = await stripeSession(planId);
    const user = await admin.auth().getUser(customerId);

    await admin.database().ref("users").child(user.uid).update({
         subscription : {
          sessionId: session.id
         }

    })

    console.log("session from  post request", session);
     return res.json({session});

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
          const planType = subscription.plan.amount === 2900 ? "basic" : "pro";
          const startDate = moment.unix(subscription.current_period_start).format('YYYY-MM-DD');
          const endDate = moment.unix(subscription.current_period_end).format('YYYY-MM-DD');
          const durationInSeconds = subscription.current_period_end - subscription.current_period_start;
          const durationInDays = moment.duration(durationInSeconds, 'seconds').asDays();
          await admin.database().ref("users").child(user.uid).update({ 
              subscription: {
                sessionId: null,
                planId:planId,
                planType: planType,
                planStartDate: startDate,
                planEndDate: endDate,
                planDuration: durationInDays
              }});

            
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



const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});