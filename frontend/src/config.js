require('dotenv').config()
const mongoose = require("mongoose");
// Connect to MongoDB
const connect = mongoose.connect(process.env.DATABASE_URI)

// Check if the database is connected
connect.then(() => {
    console.log("Database connected successfully");
})
.catch((e) => {
    console.log("Database connection failed",e);
});

// Define the user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    s3FolderUrl: {
        type: String, // URL for the user's S3 folder
       
    }
});

// Create a model from the schema
const User = mongoose.model("User", userSchema);

// Export the User model
module.exports = User;
