// config/index.js
import { config as cloudinaryConfig } from 'cloudinary';
import sgClient from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const PORT = process.env.PORT || 8090;
export const JWT_SECRET = process.env.JWT_SECRET;
export const CLIENT_ORIGIN = process.env.CORS_ORIGIN || 'https://schul-dashboards.onrender.com';
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
export const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.SMTP_FROM || 'no-reply@yourdomain.com';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cloudinary config
cloudinaryConfig({
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
export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// SendGrid setup
if (!SENDGRID_API_KEY) {
    console.error('WARN: SENDGRID_API_KEY nicht gesetzt. E-Mails können nicht versendet werden.');
} else {
    sgClient.setApiKey(SENDGRID_API_KEY);
    (async () => {
        try {
            await sgClient.request({ method: 'GET', url: '/v3/user/profile' });
            console.log('SendGrid API erreichbar und konfiguriert.');
        } catch (err) {
            console.error('SendGrid API Test fehlgeschlagen:', err?.response?.body || err?.message || err);
        }
    })();
}

export default {
    PORT,
    JWT_SECRET,
    CLIENT_ORIGIN,
    SENDGRID_API_KEY,
    SENDGRID_FROM,
    GEMINI_API_KEY,
    supabase,
    geminiModel
};