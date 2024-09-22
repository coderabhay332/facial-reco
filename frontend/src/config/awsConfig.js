const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const User = require('../models/userModel'); // Adjust the path as needed

// Initialize S3 client
const s3 = new S3Client({
    region: process.env.AWS_REG,
    credentials: {
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SEC,
    }
});

// Ensure that the bucket name is defined in the environment variables
const bucketName = process.env.BUCKET_NAME || "face-reco-storage";

if (!bucketName) {
    throw new Error('Bucket name is not defined in the environment variables');
}

// Multer configuration for S3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: bucketName,
        key: function (req, file, cb) {
            try {
                // Synchronously access session data
                const userId = req.session.userId;

                // If user ID is missing, return an error
                if (!userId) {
                    return cb(new Error('User not authenticated'));
                }

                // Construct the key for the file using the desired folder
                const fileKey = `${userId}/${Date.now()}_${file.originalname}`; // Use userId and a timestamp to avoid name collisions
                console.log(`Uploading file to: ${fileKey}`);

                // Pass the file key to Multer-S3
                cb(null, fileKey);
            } catch (error) {
                // Pass any error to the callback
                cb(error);
            }
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
}).array('images', 5); // Handle up to 5 files

// Export upload middleware
module.exports = {upload};
