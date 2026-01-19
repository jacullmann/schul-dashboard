import { validationResult } from 'express-validator';
import dayjs from 'dayjs';

export function sendJSONError(res, status, msg, errors) {
    return res.status(status).json({ error: msg, errors });
}

export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendJSONError(res, 400, 'Validierungsfehler. Bitte überprüfe deine Eingabe.', errors.array());
    }
    next();
}

export function requireAdmin(req, res, next) {
    if (!req.user?.isAdmin) {
        return sendJSONError(res, 403, 'Forbidden');
    }
    next();
}

export function isValidCloudinaryUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' &&
            parsed.hostname === 'res.cloudinary.com';
    } catch {
        return false;
    }
}

export function validateItemCreation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMap = {
            'type': 'Der Eintragstyp ist ungültig.',
            'title': 'Passe den Titel an (2-60 Zeichen).',
            'subject': 'Passe das Fach an (2-40 Zeichen).',
            'description': 'Die Beschreibung ist zu lang.',
            'images': 'Du kannst maximal 8 Bilder selbst hochladen.',
            'dueDate': 'Das Datumsformat ist ungültig.'
        };
        const firstError = errors.array()[0];
        const fieldName = firstError.param;
        const userFriendlyMessage = errorMap[fieldName] || `Ungültiger Wert für ${fieldName}`;
        return sendJSONError(res, 400, userFriendlyMessage, errors.array());
    }

    const { dueDate } = req.body;
    const now = dayjs();
    if (dayjs(dueDate).isBefore(now.subtract(2, 'day'))) {
        return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Vergangenheit.');
    } else if (dayjs(dueDate).isAfter(now.add(365, 'day'))) {
        return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Zukunft.');
    }
    next();
}