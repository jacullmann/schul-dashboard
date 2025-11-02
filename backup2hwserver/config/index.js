// config/index.js
import { v2 as cloudinary } from 'cloudinary';
import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Supabase config
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Gemini AI config
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// SendGrid config
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
export const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.SMTP_FROM || 'no-reply@yourdomain.com';

if (!SENDGRID_API_KEY) {
    console.error('WARN: SENDGRID_API_KEY nicht gesetzt. E-Mails können nicht versendet werden.');
} else {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const CLIENT_ORIGIN = process.env.CORS_ORIGIN || 'https://schul-dashboards.onrender.com';

export default {
    JWT_SECRET,
    CLIENT_ORIGIN,
    SENDGRID_API_KEY,
    SENDGRID_FROM,
    supabase,
    geminiModel
};