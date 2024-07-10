const mongoose = require("mongoose")

const connectToMongo = () => {
    mongoose.connect("mongodb+srv://anaschaudry2002:LlSYcM5ypX4jKkDI@captifycluster.ir4kjno.mongodb.net/preAudio", {
        
       
    })
    console.log("Connect to MongoDB Successfully")
}


module.exports = connectToMongo