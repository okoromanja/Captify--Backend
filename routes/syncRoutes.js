const express = require('express');
const syncModel = require("../models/syncModel")
const axios = require('axios');
const router = express.Router();




// Parse JSON request bodies
router.use(express.json());


// Number 1: Api To complete the firststep of revAI

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






// Number 2: Api To complete the second step of revAI

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


// Number 3: Api To complete the third step of revAI

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







// Number 4: Api To save the SyncData to database 

router.post("/saveData", async (req, res) => {
    try {
        const { syncData, userId, audio, transcript, cloudUrl } = req.body;
        // Access transcriptions directly from req.body

        console.log("file in request body", audio, transcript)



        // console.log("sync data, file, userId, cloudUrl", syncData, file, userId, cloudUrl)

        // Create a new transcription document using the Mongoose model

        // Transform syncData structure as needed before storing
        const formattedSyncData = syncData.monologues.map(monologue => ({
            speaker: monologue.speaker,
            elements: monologue.elements.map(words => ({
                type: words.type,
                value: words.value.replace(/\n/g, ''), // Remove newlines
                ts: words.ts,
                end_ts: words.end_ts,
            }))
        }));

        // Create a new transcription document using the Mongoose model
        const transcription = new syncModel({
            userId: userId,
            audio_url: cloudUrl.audio,
            status: "completed",
            audioFilename: audio,
            transcriptFilename: transcript,
            syncData: formattedSyncData,
        });


        // Save the transcription document to the database
        const savedTranscription = await transcription.save();

        res.send({ message: 'Transcription saved successfully', transcription: savedTranscription });
    } catch (error) {
        console.log("Error while saving the data", error);
        res.status(500).json({ error: "Error while saving the transcription in the database" });
    }
});







// Number 5:  Api to fetch all transcriptions of single user based on userId

router.post("/fetch-data", async (req, res) => {
    try {
        const { userId } = req.body;
        console.log(userId)
        // Find the document for the user
        const userDocument = await syncModel.find({ userId });

        if (!userDocument) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return the transcriptions for the user

        return res.send(userDocument)
    } catch (error) {
        console.log("Error while fetching the data", error);
        return res.status(500).json({ error: "Error while fetching the transcriptions from the database" });
    }
});




// Number 6:  Api to fetch the single transcription on the base of transcription id 

router.post("/fetch-transcript", async (req, res) => {
    try {
        const { id } = req.body;
        console.log("id from view sync", id)
        // Find the document for the user
        const userDocument = await syncModel.findById(id);
        console.log(userDocument)

        if (!userDocument) {
            return res.status(404).json({ error: "Transcription not found" });
        }

        // Return the transcriptions for the user
        return res.send(userDocument)
    } catch (error) {
        console.log("Error while fetching the single transcription", error);
        return res.status(500).json({ error: "Error while fetching the transcription from the database" });
    }
});



// Number 7: Api to delete the transcription 


router.delete("/deleteTranscription", async (req, res) => {
    try {
        const { id } = req.body;
        console.log(req.body)
        userDocument = await syncModel.findByIdAndDelete(id)
        res.status(200).json({ message: "Transcription deleted successfully" })
    } catch (error) {
        console.log("Error while deleting the transcription")
    }


})



module.exports = router;