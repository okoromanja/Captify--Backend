const express = require('express');

const axios = require('axios');
const router = express.Router();




// Parse JSON request bodies
router.use(express.json());



router.post('/submit-alignment-job', async (req, res) => {
    try {
        const requestBody = {
            metadata: 'This is forced alignment test',
            source_config: {
                url: req.body.audioUrl,

            },
            source_transcript_config: {
                url: req.body.transcriptUrl,

            }
        };


        console.log(requestBody)

        const resp = await axios.post(
            'https://api.rev.ai/alignment/v1/jobs',
            requestBody,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.REV_ACCESS_TOKEN}`
                },

            }
        );

        // if (!resp.ok) {
        //   throw new Error(`Failed to submit alignment job: ${resp.status} - ${resp.statusText}`);
        // }


        console.log("dataaaaa", resp)
        res.send(resp.data); // Send only the data
    } catch (error) {
        console.error('Errorrrrrrrrrrrrrrrr:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});








router.post('/submit-alignment-job-second', async (req, res) => {
    try {

        const id = req.body.id



        console.log("id", id)

        const resp = await axios.get(
            `https://api.rev.ai/alignment/v1/jobs/${id}`,

            {
                headers: {

                    Authorization: `Bearer ${process.env.REV_ACCESS_TOKEN}`
                },

            }
        );

        // if (!resp.ok) {
        //   throw new Error(`Failed to submit alignment job: ${resp.status} - ${resp.statusText}`);
        // }


        console.log("dataaaaa", resp)
        res.send(resp.data); // Send only the data
    } catch (error) {
        console.error('Errorrrrrrrrrrrrrrrr:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




router.post('/submit-alignment-job-third', async (req, res) => {
    try {

        const id = req.body.id



        console.log("id", id)

        const resp = await axios.get(
            `https://api.rev.ai/alignment/v1/jobs/${id}/transcript`,

            {
                headers: {

                    Authorization: `Bearer ${process.env.REV_ACCESS_TOKEN}`,
                    Accept: 'application/vnd.rev.transcript.v1.0+json'
                },

            }
        );

        // if (!resp.ok) {
        //   throw new Error(`Failed to submit alignment job: ${resp.status} - ${resp.statusText}`);
        // }


        console.log("dataaaaa", resp)
        res.send(resp.data); // Send only the data
    } catch (error) {
        console.error('Errorrrrrrrrrrrrrrrr:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;