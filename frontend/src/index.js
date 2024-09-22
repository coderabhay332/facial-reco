require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const { upload } = require('./config/awsConfig');
const authController = require('./controllers/authController');
const fileController = require('./controllers/fileController');
const app = express();
const User = require('./models/userModel');
require('./config/dbConfig'); // MongoDB connection

// Middleware to generate nonce
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Apply middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Apply Helmet for security headers
app.use(helmet());
app.use((req, res, next) => {
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", `'nonce-${res.locals.nonce}'`, "https://fonts.googleapis.com", 
                                                            "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`, "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    })(req, res, next);
});

// Routes
app.get("/", (req, res) => {
    res.render('index');
});

app.get("/signup", authController.getSignup);
app.post('/signup', authController.postSignup);

app.get("/login", authController.getLogin);
app.post('/login', authController.postLogin);

app.get('/upload', authController.checkAuth, (req, res) => {
    res.render('upload');
});

// Apply multer upload middleware and fileController.uploadFiles for the upload route
app.post('/upload', authController.checkAuth, (req, res) => {
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

app.get('/download-all', authController.checkAuth, fileController.downloadAllFiles);

// Start the server
const port = process.env.PORT || 8999;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
