const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb+srv://akgabhay11:gZUWybkmXirhpzRC@face-reco.yzalv.mongodb.net/?retryWrites=true&w=majority&appName=face-reco");

// check database connected or not
connect.then(() => {
    console.log("Database connected Successfully");
})

.catch(() => {
    console.log("Database cannot be connected");
});

// created a scheme
const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

// collection part
const collection = new mongoose.model("users", LoginSchema);

module.exports = collection;