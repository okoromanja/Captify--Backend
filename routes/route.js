const express = require('express');
const preAudioModel = require('../models/preAudioModel');
const axios = require('axios');
const router = express.Router();
const bodyParser = require("body-parser");
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');



router.use(bodyParser.json({ limit: '3000mb' }));
router.use(bodyParser.urlencoded({ limit: '3000mb', extended: true }));



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, "./")
    },
    filename: function (req, file, cb) {
        return cb(null, `${Date.now()}_${file.originalname}`)
    }
})

const upload = multer({ storage })


// Number 1: Api To save the transcriptions of to database 

router.post("/savePreAudio", async (req, res) => {
    try {
        const { id, text, audio_url, status, audio_duration, utterances, sentimentAnalysisResults, userId, filename } = req.body;
        // Access transcriptions directly from req.body



        // Create a new transcription document using the Mongoose model
        const transcription = new preAudioModel({
            userId: userId,
            id: id,
            text: text,
            audio_url: audio_url,
            status: status,
            filename: filename,
            audio_duration: audio_duration,
            utterances: utterances.map(utterance => ({
                speaker: utterance.speaker,
                text: utterance.text,
                start: utterance.start,
                end: utterance.end

            })),
            sentimentAnalysisResults: sentimentAnalysisResults.map(result => ({
                text: result.text,
                start: result.start,
                end: result.end,
                sentiment: result.sentiment,
                confidence: result.confidence
                // Add other fields from sentiment analysis results as needed
            }))
        });

        // Save the transcription document to the database
        const savedTranscription = await transcription.save();

        res.status(200).json({ message: 'Transcription saved successfully', transcription: savedTranscription });
    } catch (error) {
        console.log("Error while saving the data", error);
        res.status(500).json({ error: "Error while saving the transcription in the database" });
    }
});




// Number 2:  Api to fetch all transcriptions of single user based on userId

router.post("/fetchPreAduio", async (req, res) => {
    try {
        const { userId } = req.body;

        // Find the document for the user
        const userDocument = await preAudioModel.find({ userId });

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





// Number 3:  Api to fetch the single transcription on the base of transcription id 

router.post("/fetchSingleTranscription", async (req, res) => {
    try {
        const { id } = req.body;

        // Find the document for the user
        const userDocument = await preAudioModel.findOne({ id });

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


// Number 4: Api to update the transcriptions 


router.put("/updatePreAudio", async (req, res) => {
    try {
        const { updatedSentimentAnalysisResults, id } = req.body;



        // Find the document with the provided id and update it
        await preAudioModel.findOneAndUpdate(
            { id: id },
            { $set: { sentimentAnalysisResults: updatedSentimentAnalysisResults } } // Use $set to update specific fields in the document
        );

        // No need to send any response
        res.status(200).json({ message: 'Transcript updated successfully' }); // Send a 204 No Content response
    } catch (error) {
        console.log("Error while updating the transcription", error);
        res.status(500).json({ error: "Error while updating the transcription" });
    }
});



// Number 5: Api to delete the transcription 


router.delete("/deleteTranscription", async (req, res) => {
    try {
        const { id } = req.body;
        console.log(req.body)
        userDocument = await preAudioModel.findOneAndDelete({ id })
        res.status(200).json({ message: "Transcription deleted successfully" })
    } catch (error) {
        console.log("Error while deleting the transcription")
    }
})



// Number 6: Api to convert the video files to audio files

router.post('/extract-audio', upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }



        console.log("req.file in extract audio", req.file)
        // Create a readable stream from the uploaded video file data
        const videoStream = new PassThrough();
        videoStream.end(req.file.buffer);

        // Create a writable stream to store the converted audio data
        const audioStream = new PassThrough();

        // Perform the conversion from video to audio
        ffmpeg()
            .input(videoStream)
            .toFormat('mp3')
            .on('error', (err) => {
                console.error('Error converting video to audio:', err);
                res.status(500).json({ error: 'Error converting video to audio' });
            })
            .pipe(audioStream);

        // Stream the converted audio data back to the client
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename=audio.mp3'
        });
        audioStream.pipe(res);
    } catch (error) {
        console.error('Error extracting audio:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});









module.exports = router;