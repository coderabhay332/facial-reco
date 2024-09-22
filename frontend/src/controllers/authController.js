const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const AWS = require('@aws-sdk/client-s3');
require('dotenv').config();
const { ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const util = require("util");


const s3 = new AWS.S3Client({
    region: process.env.AWS_REG,
    credentials: {
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SEC,
    }
});
const bucketName = process.env.S3_BUCKET_NAME || 'face-reco-storage'; 
// Handle user signup
exports.postSignup = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ name: username });
        if (existingUser) {
            return res.status(400).send('User already exists, please choose a different username');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({ name: username, password: hashedPassword, s3FolderUrl: '' });
        await newUser.save();

        // Set user ID in session
        req.session.userId = newUser._id;
        console.log('User ID set in session:', req.session.userId);

        // Define S3 parameters to create a folder

        const params = {
            Bucket: bucketName,
            Key: `${newUser._id}/`, // S3 folder key, using the new user's unique MongoDB ID
            Body: '', // Empty body to create a folder
        };

        // Create a folder in S3 for the new user
        await s3.send(new AWS.PutObjectCommand(params));
        console.log(`S3 folder created for user ${newUser._id}`);

        // Generate the URL for the user's S3 folder
        const s3FolderUrl = `https://${bucketName}.s3.${process.env.AWS_REG}.amazonaws.com/${newUser._id}/`;

        // Update the user's record with the S3 folder URL
        const updatedUser = await User.findByIdAndUpdate(
            newUser._id,
            { s3FolderUrl: s3FolderUrl },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            throw new Error("User update failed");
        }

        console.log('Updated user with URL:', updatedUser);

        // Redirect to upload page after successful signup
        res.redirect('/upload');
    } catch (error) {
        res.status(500).send(`Error signing up user: ${error.message}`);
    }
};

// Handle user login
exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ name: username });
        if (!user) return res.status(400).send('Invalid username');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send('Incorrect password');

        req.session.userId = user._id;

        console.log('User ID set in session:', req.session.userId);

        res.redirect('/upload');
    } catch (error) {
        res.status(500).send('Error logging in: ' + error.message);
    }
};

// Middleware for checking authentication
exports.checkAuth = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Rendering functions
exports.getLogin = (req, res) => {
    res.render('login');
};

exports.getSignup = (req, res) => {
    res.render('signup');
};
