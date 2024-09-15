const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const collection = require("./config"); // Import the collection model

const app = express();

// Convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Register user
app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password
    };

    try {
        // Check if user already exists
        const existUser = await collection.findOne({ name: data.name });
        if (existUser) {
            return res.send("User already exists, Please choose a different username");
        } 

        // Hash the password using bcrypt
        const saltRounds = 10;
        const hashSaltPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashSaltPassword;

        // Create a new user document and save it
        const newUser = new collection(data);
        await newUser.save();
        
        // Redirect to login page after successful signup
        res.redirect('/');
    } catch (error) {
        console.error("Error during signup:", error);
        res.send("Error during signup");
    }
});

// Login user
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            return res.send("Username not found");
        }

        // Compare the hashed password
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (isPasswordMatch) {
            res.render("home");
        } else {
            res.send("Incorrect password");
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.send("Error logging in");
    }
});

const port = 8999;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
