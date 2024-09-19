const AWS = require('@aws-sdk/client-s3');
const util = require("util");
const User = require('../models/userModel');
const { ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const pipeline = util.promisify(require("stream").pipeline);
require('dotenv').config(); 
const path = require('path');
const fs = require("fs");
const s3 = new AWS.S3Client({
    region: process.env.AWS_REG,
    credentials: {
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SEC,
    }
});

const bucketName = process.env.S3_BUCKET_NAME || 'face-reco-storage';

// Upload files to S3
exports.uploadFiles = async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return { message: 'No files uploaded.' }; // Return message instead of sending response here
    }

    console.log(req.files); // Debugging

    const folderKey = `${req.session.userId}/`; // User-specific folder in S3

    try {
        // Check if the folder already exists
        const listParams = { Bucket: bucket, Prefix: folderKey };
        const data = await s3.send(new ListObjectsV2Command(listParams));

        let isFirstUpload = false;
        if (!data.Contents || data.Contents.length === 0) {
            isFirstUpload = true; // First time user is uploading
        }

        // Retrieve S3 file URLs after upload
        const fileUrls = req.files.map(file => file.location);

        console.log('Uploaded file URLs:', fileUrls);

        // Message based on whether it's the first upload
        const message = isFirstUpload
            ? 'Congrats, your bucket is created successfully!'
            : 'Files are uploaded successfully!';

        return { message, fileUrls }; // Return data
    } catch (error) {
        console.error('Error uploading files:', error);
        throw new Error('Error uploading files: ' + error.message); // Throw error to be caught in the route
    }
};

// Download all files for a user from S3
exports.downloadAllFiles = async (req, res) => {
    const userId = req.session.userId;  // Get the user ID from the session

    try {
        // Find the user in the database
        const user = await User.findById(userId);
        if (!user || !user.s3FolderUrl) {
            return res.status(404).send('User or S3 folder not found');
        }

        // Define the prefix (folder path) in the S3 bucket
        const folderKey = `${user._id}/`;

        // List all objects (files) in the user's folder
        const listParams = {
            Bucket: bucketName,
            Prefix: folderKey,
        };

        const listCommand = new ListObjectsV2Command(listParams);
        const data = await s3.send(listCommand);

        if (!data.Contents || data.Contents.length === 0) {
            return res.status(404).send('No files found in the folder');
        }

        // Define the path where you want to download files on your local machine
        const downloadFolderPath = path.join('F:/facial-reco/backend/Images');

        // Ensure the folder exists, if not create it
        if (!fs.existsSync(downloadFolderPath)) {
            fs.mkdirSync(downloadFolderPath, { recursive: true });
        }

        // Iterate over each file in the folder and download it
        for (const file of data.Contents) {
            const fileKey = file.Key;  // The file path in S3
            const fileName = path.basename(fileKey);  // Extract the file name
            const downloadPath = path.join(downloadFolderPath, fileName);  // Local path to save the file

            // Fetch the file from S3
            const getParams = {
                Bucket: bucketName,
                Key: fileKey,
            };

            const getObjectCommand = new GetObjectCommand(getParams);
            const s3Object = await s3.send(getObjectCommand);

            // Pipe the file stream to a local file
            await pipeline(s3Object.Body, fs.createWriteStream(downloadPath));

            console.log(`Downloaded: ${fileName}`);
        }

        // Send a response after all files are downloaded
        res.status(200).send({
            message: 'All files downloaded successfully',
            downloadFolderPath,
        });

    } catch (err) {
        console.error('Error downloading files:', err);
        res.status(500).send(`Error downloading files: ${err.message}`);
    }
}
