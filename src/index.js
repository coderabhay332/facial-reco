const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const collections = require("./config");


const app = express();
// convert data into json format
app.use(express.json());

app.use(express.urlencoded({extended: false}));

//use ejs as the view engine 
app.set('view engine', 'ejs');

// Serve static files from the "public" directory
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

// register user
app.post("/signup", async(req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password
    }

    // check if user already exists
    const existUser = await collection.findOne({name: data.name});
    if(existUser) {
        res.send("User already exist, Please choose a different username");
    } else {
        // hash the password using becrypt
        const saltRounds = 10; // no of salt round for bcrypt
        const hashSaltPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashSaltPassword; // replace the original pass in hash format
        const userdata = await collection.insertMany(data);
    console.log(userdata);
    }
    
})

// login user
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({name: req.body.username});
        if(!check) {
            res.send("user name cannot find");
        }
        // comparea the hash pass from the database with the plain text
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if(isPasswordMatch) {
            res.render("home");
        } else {
            res.send("wrong password");
        }
    } catch {
        res.send("Wrong Details");
    }
});

const port = 8999;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})