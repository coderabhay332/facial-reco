const AWS = require('@aws-sdk/client-s3');
const util = require("util");
const User = require('../models/userModel');
const { ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const pipeline = util.promisify(require("stream").pipeline);
require('dotenv').config(); 
const { Upload } = require('@aws-sdk/lib-storage');
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
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

        const data = await s3.send(new ListObjectsV2Command(listParams));

        if (!data.Contents || data.Contents.length === 0) {
            return res.status(404).send('No files found in the folder');
        }

        // Iterate over each file in the folder and upload it to the new S3 path
        for (const file of data.Contents) {
            const fileKey = file.Key;  // The file path in S3
            const fileName = path.basename(fileKey);  // Extract the file name
            const newFileKey = `Encoder-images/${fileName}`; // New path in S3

            // Fetch the file from the original S3 location
            const getParams = {
                Bucket: bucketName,
                Key: fileKey,
            };

            const s3Object = await s3.send(new GetObjectCommand(getParams));

            // Use Upload utility to handle the upload
            const upload = new Upload({
                client: s3,
                params: {
                    Bucket: 'face-reco-storage',
                    Key: newFileKey,
                    Body: s3Object.Body,
                },
            });

            await upload.done(); // Wait for the upload to complete
            console.log(`Uploaded to S3: ${newFileKey}`);

            // Optionally delete the original file if necessary
            // await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: fileKey }));
            // console.log(`Deleted original file: ${fileKey}`);
        }

        // Send a response after all files are moved
        res.status(200).send({
            message: 'All files moved to S3 successfully',
        });

    } catch (err) {
        console.error('Error moving files:', err);
        res.status(500).send(`Error moving files: ${err.message}`);
    }
}