const express = require('express')
const router = express.Router();
const bodyParser = require("body-parser");
const moment = require("moment")

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);




router.use(bodyParser.json({ limit: '3000mb' }));
router.use(bodyParser.urlencoded({ limit: '3000mb', extended: true }));


// Endpoint to get the payments analytics from stripe 

router.get('/total-products', async (req, res) => {
    try {




        const subscriptions = await stripe.subscriptions.list({
            limit: 1000, // Adjust the limit as needed
        });



        // Count the number of subscriptions for each plan
        const planCounts = {};
       

        subscriptions.data.forEach(subscription => {
            const planId = subscription.plan.id;
            if (planCounts[planId]) {
                planCounts[planId] += 1;
            } else {
                planCounts[planId] = 1;
            }
        });
        console.log("plan counts", planCounts)

        const totalSubscriptions = Object.values(planCounts).reduce((acc, val) => acc + val, 1);



        res.status(200).json({ planCounts: planCounts, totalSubscriptions: totalSubscriptions, });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).send('Internal server error');
    }
});




router.get('/weekly-numbers', async (req, res) => {
    try {
        const oneWeekAgo = moment().subtract(7, 'days').startOf('day').unix(); // Get the UNIX timestamp


        const userCounts = {
            Sun: 0,
            Mon: 0,
            Tue: 0,
            Wed: 0,
            Thu: 0,
            Fri: 0,
            Sat: 0,
        };
        let planCounts = {};
        let totalCount = 0;
        let subscriptions = [];
        let hasMore = true;
        let startingAfter = null;


        // Fetch users with pagination
        while (hasMore) {

            const listParams = {
                limit: 100,
                created: { gte: oneWeekAgo },
            };

            if (startingAfter) {
                listParams.starting_after = startingAfter;
            }

            const listUsersResult = await stripe.subscriptions.list(listParams);
            subscriptions = subscriptions.concat(listUsersResult.data);
            hasMore = listUsersResult.has_more;
            if (hasMore) {
                startingAfter = listUsersResult.data[listUsersResult.data.length - 1].id;
            }
        }

        // Process the subscriptions to calculate counts
        subscriptions.forEach(subscription => {
            const creationTime = new Date(subscription.created * 1000);
            const dayOfWeek = moment(creationTime).format('ddd');
            userCounts[dayOfWeek] += 1;

            const planId = subscription.plan.id;

            if (planCounts[planId]) {
                planCounts[planId] += 1;
            } else {
                planCounts[planId] = 1;
            }
            totalCount += 1;
        });

        // Convert userCounts to array format for easier consumption in frontend
        const userCountsArray = Object.keys(userCounts).map(day => ({
            name: day,
            products: userCounts[day]
        }));

        // Reorder the array to ensure it starts from Sunday
        const orderedDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const orderedUserCountsArray = orderedDays.map(day => userCountsArray.find(item => item.name === day));





        res.status(200).json({ planCounts, totalCount, productCountWeekly: orderedUserCountsArray });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).send('Internal server error');
    }
});




// Endpoint to get the percentage analytics from Stripe
router.get('/products-percentage', async (req, res) => {
    try {
        const oneMonthAgo = moment().subtract(1, 'month').startOf('day').unix();
        

        let subscriptions = [];
        let hasMore = true;
        let startingAfter = null;

        // Fetch subscriptions with pagination
        while (hasMore) {
            const listParams = {
                limit: 100,
                created: { gte: oneMonthAgo }, // Fetch subscriptions from the last two months
            };

            if (startingAfter) {
                listParams.starting_after = startingAfter;
            }

            const listUsersResult = await stripe.subscriptions.list(listParams);
            subscriptions = subscriptions.concat(listUsersResult.data);
            hasMore = listUsersResult.has_more;
            if (hasMore) {
                startingAfter = listUsersResult.data[listUsersResult.data.length - 1].id;
            }
        }

        // Count the number of subscriptions for each plan
        const planCounts = {};
        let oneMonthSubscriptions = 0;
        

        subscriptions.forEach(subscription => {

            const creationTime = new Date(subscription.created * 1000).getTime();

            if (creationTime >= oneMonthAgo) {
                oneMonthSubscriptions += 1;
            }
            


        });



        // Calculate the percentage of subscriptions in the last month over the previous month
        const subscriptionPercentage =  (oneMonthSubscriptions / 100) * 100 

        res.status(200).json({


            oneMonthSubscriptions: oneMonthSubscriptions,
           
            subscriptionPercentage: Math.round(subscriptionPercentage * 100) / 100 // Round to two decimal places
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).send('Internal server error');
    }
});





module.exports = router
