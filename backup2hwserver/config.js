// config.js
export const JWT_SECRET = process.env.JWT_SECRET;
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
export const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.SMTP_FROM || 'no-reply@yourdomain.com';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const CLIENT_VERIFY_URL = process.env.CLIENT_VERIFY_URL;

export const DEFAULT_SUBJECTS = [
    'Mathe', 'Deutsch', 'Englisch', 'Französisch', 'Erdkunde', 'Sport',
    'Biologie', 'Chemie', 'Physik', 'Ethik', 'Politik', 'Musik',
    'Enrichment', 'WPU', 'Theater', 'Latein'
];

export const CLOUDINARY_CONFIG = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
};

export const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};