const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define a schema for the elements within syncData
const elementSchema = new mongoose.Schema({
    type: String,
    value: String,
    ts: Number,
    end_ts: Number
});

// Define your Mongoose schema for syncData
const syncDataSchema = new mongoose.Schema({
    speaker: Number,
    elements: [elementSchema] // Array of elements
});

// Define your Mongoose schema for the entire document
const transcriptionSchema = new mongoose.Schema({
    userId: String,
    audio_url: String,
    status: String,
    audioFilename: String,
    transcriptFilename: String,
    syncData: [syncDataSchema] // Array of syncData
});

// Create a model for the transcription schema
const syncModel = mongoose.model('syncData', transcriptionSchema);

module.exports = syncModel;
