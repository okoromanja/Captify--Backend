const express = require('express')
const router = express.Router();
const bodyParser = require("body-parser");
const admin = require('../firebase');





router.use(bodyParser.json({ limit: '3000mb' }));
router.use(bodyParser.urlencoded({ limit: '3000mb', extended: true }));



// Endpoint to fetch the List of users from the database
router.get("/totalusers", async (req, res) => {

    try {

        const listUsersResult = await admin.auth().listUsers();
        // const userCount = await listUsersResult.users.length();



        const usersCount = listUsersResult.users.length
        console.log("total number of users", usersCount)

        res.status(200).json({ usersCount })
    } catch (error) {
        console.log("Error while fething users list from firebase", error)
        res.status(500).send("Internal server error", error)
    }

})


module.exports = router