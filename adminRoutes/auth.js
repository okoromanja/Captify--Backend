const express = require('express')
const router = express.Router();
const bodyParser = require("body-parser");
const admin = require('../firebase');
const moment = require("moment")
const preAudioModel = require("../models/preAudioModel")
const syncModel = require("../models/syncModel")





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


// Endpoint to fetch the user and his subscrptions details from realtime database

router.get('/fetch-user-realtime', async (req, res) => {

  try {
    const userDetailsSnapshot = await admin.database().ref("users").get()
    const userDetails = userDetailsSnapshot.val();
    console.log("user details from realtime datbase", userDetails)

    const userDetailsArray = Object.keys(userDetails).map(key => ({
      id: key,
      ...userDetails[key]
    }))



    res.status(200).json({ userDetails: userDetailsArray })
  } catch (error) {
    console.log("Error while fetching the data from realtime firebase realtime database", error)
  }

})




// Endpoint to create a new user from admin
router.post('/create-user', async (req, res) => {
  const { email, password, displayName, status } = req.body;



  try {
    // Create a new user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password
    });

    // Update the user's profile to set the display name
    await admin.auth().updateUser(userRecord.uid, {
      displayName: displayName
    });

    // Set custom claims (including the status field)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      active: status
    })

    res.status(201).send({ message: 'User created successfully', uid: userRecord.uid });
  } catch (error) {
    console.error('Error creating new user:', error);
    res.status(500).send(error);
  }
});


// Endpoint to update the user from admin
router.post('/update-user', async (req, res) => {
  const { uid, active } = req.body;

  if (typeof uid !== 'string' || typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    // Get the existing custom claims
    const user = await admin.auth().getUser(uid);
    console.log("user to update", user)
    const currentClaims = user.customClaims || {};

    // Update the custom claims with the new status
    const updatedClaims = { ...currentClaims, active };

    // Set the new custom claims
    await admin.auth().setCustomUserClaims(uid, updatedClaims);

    res.status(200).json({ message: 'User status updated successfully', forUser: user.displayName });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Endpoint to ban the user

router.post('/ban-user', async (req, res) => {
  const { uid } = req.body;

  if (typeof uid !== 'string') {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    // Disable the user by setting the disabled property to true
    await admin.auth().updateUser(uid, { disabled: true });
    await admin.auth().setCustomUserClaims(uid, {
      banned: true
    })

    res.status(200).json({ message: 'User account has been disabled successfully' });
  } catch (error) {
    console.error('Error disabling user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Endpoint to unban the user

router.post('/unban-user', async (req, res) => {
  const { uid } = req.body;

  if (typeof uid !== 'string') {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    // Disable the user by setting the disabled property to true
    await admin.auth().updateUser(uid, { disabled: false });
    await admin.auth().setCustomUserClaims(uid, {
      banned: false
    })

    res.status(200).json({ message: 'User account has been disabled successfully' });
  } catch (error) {
    console.error('Error disabling user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to delete the user

router.post('/delete-user', async (req, res) => {
  const { uid } = req.body;

  if (typeof uid !== 'string') {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {

    await admin.auth().deleteUser(uid);
    await admin.database().ref(`/users/${uid}`).remove();
    await preAudioModel.deleteMany({ userId: uid });
    await syncModel.deleteMany({ userId: uid })

    res.status(200).json({ message: 'User account and all its data has been deleted successfully' });
  } catch (error) {
    console.error('Error disabling user account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router