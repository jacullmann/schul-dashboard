// lib/sanitize.js
import sanitizeHtml from 'sanitize-html';

const strictOptions = {
    allowedTags: [],
    allowedAttributes: {}
};

const moderateOptions = {
    allowedTags: ['br', 'p', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    allowedSchemes: []
};

export const sanitizeStrict = (input) => {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input, strictOptions).trim();
};

export const sanitizeModerate = (input) => {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input, moderateOptions).trim();
};

export const sanitizeObject = (obj, fieldsConfig) => {
    const sanitized = { ...obj };

    for (const [field, config] of Object.entries(fieldsConfig)) {
        if (sanitized[field] && typeof sanitized[field] === 'string') {
            if (config === 'strict') {
                sanitized[field] = sanitizeStrict(sanitized[field]);
            } else if (config === 'moderate') {
                sanitized[field] = sanitizeModerate(sanitized[field]);
            }
        }
    }

    return sanitized;
};