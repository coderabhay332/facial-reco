const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    s3FolderUrl: {
        type: String, // URL for the user's S3 folder
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
