require('dotenv').config();
const mongoose = require('mongoose');

// Ensure DATABASE_URI is set in your .env file
const mongoURI = process.env.DATABASE_URI;
if (!mongoURI) {
    throw new Error('DATABASE_URI is not defined in environment variables.');
}

// Connect to MongoDB
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection failed:', err));

// If you want to use mongoose elsewhere, you can export it
module.exports = mongoose;
