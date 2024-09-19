const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet()); // Sets various HTTP headers for security

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Secure cookies in production
        httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
        maxAge: 60 * 60 * 1000 // Set cookie expiry (1 hour)
    }
}));

// Custom middleware for logging or other purposes (if needed)
// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.url}`);
//     next();
// });

module.exports = app;
