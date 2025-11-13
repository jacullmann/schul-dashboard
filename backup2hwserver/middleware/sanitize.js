// middleware/sanitize.js
import sanitizeHtml from 'sanitize-html';
import { sanitizeObject } from '../lib/sanitize.js';

const sanitizeConfigs = {
    '/api/items': {
        body: {
            title: 'strict',
            subject: 'strict',
            description: 'moderate'
        }
    },
    '/api/announcements': {
        body: {
            title: 'strict',
            content: 'moderate'
        }
    },
    '/api/auth/register': {
        body: {
            email: 'strict'
        }
    },
    '/api/auth/login': {
        body: {
            email: 'strict'
        }
    },
    '/anon/sorgenbox': {
        body: {
            message: 'moderate'
        }
    },
    '/api/reports': {
        body: {
            itemTitle: 'strict',
            reason: 'moderate'
        }
    },
    '/api/todos': {
        body: {
            title: 'strict',
            content: 'moderate'
        }
    },
    '/api/user/setup': {
        body: {
        }
    }
};

const sanitizeMiddleware = (req, res, next) => {
    const config = sanitizeConfigs[req.path];

    if (config && req.body) {
        if (config.body) {
            req.body = sanitizeObject(req.body, config.body);
        }
    }

    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeHtml(req.query[key], {
                    allowedTags: [],
                    allowedAttributes: {},
                    textFilter: function(text) {
                        return text.replace(/[<>]/g, '');
                    }
                });
            }
        });
    }

    console.log(`Sanitized request to ${req.path} from IP: ${req.ip}`);
    next();
};

export default sanitizeMiddleware;