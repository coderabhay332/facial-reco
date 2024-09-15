const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const collections = require("./config");
const AWS = require('aws-sdk');
const User = require('D:/eng/src/config.js'); // Corrected path

const app = express();

// convert data into json format
app.use(express.json()); // Missing JSON middleware, fixed here
app.use(express.urlencoded({ extended: false }));

AWS.config.update({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SEC,
    region: process.env.AWS_REG,
});

const s3 = new AWS.S3();
const bucketName = 'face-reco-storage';

// Use ejs as the view engine
app.set('view engine', 'ejs');

// Specify the path to the views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});
app.post('/signup', async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password,
    };

    try {
        // Check if the user already exists
        const existUser = await User.findOne({ name: data.name });
        if (existUser) {
            return res.status(400).send('User already exists, please choose a different username');
        }

        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashSaltPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashSaltPassword;

        // Create user in the database without the URL initially
        const newUser = new User({
            name: data.name,
            password: data.password,
            s3FolderUrl: '' // Initial empty URL
        });

        const savedUser = await newUser.save();
        console.log("New user saved:", savedUser);

        // Create a folder in the S3 bucket for the new user
        const params = {
            Bucket: bucketName,
            Key: `${savedUser._id}/`, // S3 folder key, using the user's unique MongoDB ID
            Body: '', // Empty body to create a folder
        };

        await s3.putObject(params).promise();

        // Generate the URL for the user's S3 folder
        const s3FolderUrl = `https://${bucketName}.s3.us-east-1.amazonaws.com/${savedUser._id}/`;

        // Update the user's record with the S3 folder URL
        const updatedUser = await User.findByIdAndUpdate(
            savedUser._id,
            { s3FolderUrl: s3FolderUrl },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            throw new Error("User update failed");
        }

        console.log('Updated user with URL:', updatedUser);

        // Send success response
        res.status(201).send({
            message: 'User successfully created and S3 folder created',
            s3FolderUrl,
        });
    } catch (error) {
        res.status(500).send(`Error signing up user: ${error.message}`);
    }
});

// login user
app.post("/login", async (req, res) => {
    try {
        const check = await collections.findOne({ name: req.body.username });
        if (!check) {
            res.send("Username not found");
        }
        // compare the hashed password
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (isPasswordMatch) {
            res.render("home");
        } else {
            res.send("Incorrect password");
        }
    } catch {
        res.send("Error logging in");
    }
});

const port = 8999;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
