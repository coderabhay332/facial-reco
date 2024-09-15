const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const AWS = require('@aws-sdk/client-s3');
const User = require('D:/eng/src/config.js'); // Adjust path as necessary
const multer = require('multer');
const multerS3 = require('multer-s3');

const app = express();

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "sec", // Use an environment variable for production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure AWS S3
const s3 = new AWS.S3Client({
    region: process.env.AWS_REG,
    credentials: {
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SEC,
    }
});

const bucketName = process.env.S3_BUCKET_NAME || 'face-reco-storage'; // Use env variable

// Use EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static("public"));

// Routes
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

        await s3.send(new AWS.PutObjectCommand(params));
        console.log(`S3 folder created for user ${savedUser._id}`);

        // Generate the URL for the user's S3 folder
        const s3FolderUrl = `https://${bucketName}.s3.${process.env.AWS_REG}.amazonaws.com/${savedUser._id}/`;

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

// Login user
app.post("/login", async (req, res) => {
    try {
        const check = await User.findOne({ name: req.body.username });
        if (!check) {
            return res.send("Username not found");
        }
        // Compare the hashed password
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (isPasswordMatch) {
            req.session.userId = check._id; // Store user ID in session
            res.render("home");
        } else {
            res.send("Incorrect password");
        }
    } catch (error) {
        res.send("Error logging in");
    }
});

// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).send('User not authenticated');
    }
};

// Configure multer for S3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: bucketName,
        key: async function (req, file, cb) {
            try {
                const userId = req.session.userId; // Get user ID from session
                const user = await User.findById(userId).exec();

                if (!user || !user.s3FolderUrl) {
                    return cb(new Error('User not found or S3 folder URL missing'));
                }

                // Construct the key for the file using the desired folder
                const fileKey = `${userId}/${Date.now()}_${file.originalname}`; // Use userId and a timestamp to avoid name collisions
                console.log(`Uploading file to: ${fileKey}`);
                cb(null, fileKey);
            } catch (err) {
                cb(err);
            }
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
}).array('images', 5); // Handle up to 5 files

app.post('/upload', checkAuth, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).send(`Error uploading files: ${err.message}`);
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        // Extract file URLs from S3
        const fileUrls = req.files.map(file => file.location);
        console.log('Uploaded file URLs:', fileUrls);

        // Optional: If you need to store file URLs in the user’s record, handle it here
        try {
            const updatedUser = await User.findById(req.session.userId);

            if (!updatedUser) {
                return res.status(404).send('User not found');
            }

            // Assuming the S3 folder URL is already set, just handle response
            res.status(200).json({
                message: 'Files successfully uploaded',
                fileUrls
            });
        } catch (error) {
            res.status(500).send(`Error updating user record: ${error.message}`);
        }
    });
});

const port = 8999;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
