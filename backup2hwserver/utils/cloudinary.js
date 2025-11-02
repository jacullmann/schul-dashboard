// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

export function signUpload(req, res) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben' },
        process.env.CLOUDINARY_API_SECRET
    );
    res.json({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben'
    });
}