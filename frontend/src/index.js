require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const { upload } = require('./config/awsConfig');
const authController = require('./controllers/authController');
const fileController = require('./controllers/fileController');
const User = require('./models/userModel');
require('./config/dbConfig'); // MongoDB connection

const app = express();

// Middleware to generate nonce for inline scripts/styles
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Apply basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


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

// Apply Helmet with global CSP

app.use((req, res, next) => {
    helmet({
        contentSecurityPolicy: {
            useDefaults: true, // Use default CSP rules and add your own
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    `'nonce-${res.locals.nonce}'`, // Use the nonce generated earlier
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com',
                    'https://cdn.tailwindcss.com' // Allow Tailwind CSS
                ],
                scriptSrc: [
                    "'self'",
                    `'nonce-${res.locals.nonce}'`, // Use the nonce for inline scripts
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com',
                    // 'https://unpkg.com', // Allow unpkg
                    'https://cdn.tailwindcss.com', // Allow Tailwind CSS
                    "'sha256-ehPVrgdV2GwJCE7DAMSg8aCgaSH3TZmA66nZZv8XrTg='" // Add your sha256 hash if needed
                ],
                fontSrc: [
                    "'self'",
                    'https://fonts.gstatic.com',
                    'https://cdnjs.cloudflare.com'
                ],
                imgSrc: [
                    "'self'",
                    'data:',
                    'https://your-s3-bucket-url' // Allow your S3 bucket for images
                ],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"],
                upgradeInsecureRequests: []
            }
        },
        crossOriginEmbedderPolicy: false // Disable COEP if required
    })(req, res, next);
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { nonce: res.locals.nonce });
});

app.get("/signup", authController.getSignup);
app.post('/signup', authController.postSignup);

app.get("/login", authController.getLogin);
app.post('/login', authController.postLogin);

app.get('/upload', authController.checkAuth, (req, res) => {
    res.render('upload', { nonce: res.locals.nonce });
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

        const fileUrls = req.files.map(file => file.location);
        console.log('Uploaded file URLs:', fileUrls);

        try {
            const updatedUser = await User.findById(req.session.userId);
            if (!updatedUser) {
                return res.status(404).send('User not found');
            }

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
