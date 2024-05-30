const express = require('express')
const router = express.Router();
const bodyParser = require("body-parser");
const admin = require('../firebase');
const moment = require("moment")





router.use(bodyParser.json({ limit: '3000mb' }));
router.use(bodyParser.urlencoded({ limit: '3000mb', extended: true }));



// Endpoint for to handel admin login







// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;


//     const userRecord = await admin.auth().getUserByEmail(email);


//     // Check if the email and password match the hardcoded admin credentials
//     if (userRecord && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
//       res.status(200).json({ message: 'Login successful', user: { email: ADMIN_EMAIL } });
//     } else {
//       res.status(401).json({ message: 'Invalid email or password' });
//     }
//   } catch (error) {
//     console.log("Error in server while admin login", error);
//     res.status(500).send("Internal server error");
//   }
// });





// Endpoint to fetch the List of users from the database
router.get("/totalusers", async (req, res) => {

  try {

    const listUsersResult = await admin.auth().listUsers();
    // const userCount = await listUsersResult.users.length();



    const usersInfo = listUsersResult;


    res.status(200).json({ usersInfo })
  } catch (error) {
    console.log("Error while fething users list from firebase", error)
    res.status(500).send("Internal server error", error)
  }

})


// Endpoint to get the 7-days users analytics info 

router.get('/recent-users-count', async (req, res) => {
  try {
    const oneWeekAgo = moment().subtract(7, 'days').startOf('day').toDate();
    const oneMonthAgo = moment().subtract(1, 'month').startOf('day').toDate();
    const twoMonthAgo = moment().subtract(2, 'month').startOf('day').toDate();
    const userCounts = {
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
    };

    let nextPageToken;
    let totalusers = 0;
    let usersLastMonth = 0
   


    // Fetch users with pagination
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(userRecord => {
        const creationTime = new Date(userRecord.metadata.creationTime);
        totalusers += 1

        if (creationTime >= oneMonthAgo) {
          usersLastMonth += 1
        }
        

        if (creationTime >= oneWeekAgo) {
          const dayOfWeek = moment(creationTime).format('ddd');
          userCounts[dayOfWeek] += 1;
        }
      });
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    // Convert userCounts to array format for easier consumption in frontend
    const userCountsArray = Object.keys(userCounts).map(day => ({
      name: day,
      users: userCounts[day]
    }));

    const percentageLastMonth = (usersLastMonth / 100) * 100



    res.status(200).json({ userCounts: userCountsArray, percentage: percentageLastMonth });
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res.status(500).send('Internal Server Error');
  }
});



module.exports = router