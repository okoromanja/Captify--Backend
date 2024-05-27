// firebase.js
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

// Check if Firebase Admin is already initialized to prevent re-initialization
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://captify-93701-default-rtdb.firebaseio.com"
      });
}

module.exports = admin;
