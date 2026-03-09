// middleware/validation.ts
import { validationResult } from 'express-validator';
import dayjs from 'dayjs';
import type { Request, Response, NextFunction } from 'express';

export function sendJSONError(
  res: Response,
  status: number,
  msg: string,
  errors?: unknown[],
): void {
  res.status(status).json({ error: msg, errors });
}

export function validate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendJSONError(
      res,
      400,
      'Validierungsfehler. Bitte überprüfe deine Eingabe.',
      errors.array(),
    );
    return;
  }
  next();
}

export function isValidCloudinaryUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com'
    );
  } catch {
    return false;
  }
}

export function validateItemCreation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap: Record<string, string> = {
      type: 'Der Eintragstyp ist ungültig.',
      title: 'Passe den Titel an (2-60 Zeichen).',
      subject: 'Passe das Fach an (2-100 Zeichen).',
      description: 'Die Beschreibung ist zu lang.',
      images: 'Du kannst maximal 8 Bilder selbst hochladen.',
      dueDate: 'Das Datumsformat ist ungültig.',
    };
    const firstError = errors.array()[0]!;
    const fieldName = (firstError as { path?: string }).path ?? '';
    const userFriendlyMessage =
      errorMap[fieldName] || `Ungültiger Wert für ${fieldName}`;
    sendJSONError(res, 400, userFriendlyMessage, errors.array());
    return;
  }

  const { dueDate } = req.body as { dueDate?: string };
  const now = dayjs();
  if (dayjs(dueDate).isBefore(now.subtract(2, 'day'))) {
    sendJSONError(res, 400, 'Das Datum liegt zu weit in der Vergangenheit.');
    return;
  } else if (dayjs(dueDate).isAfter(now.add(365, 'day'))) {
    sendJSONError(res, 400, 'Das Datum liegt zu weit in der Zukunft.');
    return;
  }
  next();
}
