const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for transcriptions
const preAudioSchema = new Schema({
    userId: {
        type: String
    },
    id: {
        type: String
    },


    sentimentAnalysisResults: [{
        text: String,
        start: Number,
        end: Number,
        sentiment: String,
        confidence: Number

    }],

    utterances: [{

        speaker: String,
        text: String,
        start: Number,
        end: Number
    }],
    status: {
        type: String
    },

    audio_url: {
        type: String
    },
    audio_duration:{
        type: Number
    },
    filename:{
        type:String
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Create a model for the transcription schema
const preAudioModel = mongoose.model('transcriptions', preAudioSchema);

module.exports = preAudioModel;
