// routes/admin.js
import express from 'express';
import { body, param } from 'express-validator';

import { User, BannedUser, Item, Report, Sorgen } from '../models/index.js';
import { requireAdmin, validate } from '../middleware/index.js';
import { sendJSONError, logActivity } from '../utils/index.js';
import { supabase, geminiModel } from '../config/index.js';

const router = express.Router();

// Get all users
router.get('/users', requireAdmin, async (req, res) => {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    res.json(users.map(u => ({
        id: u._id, email: u.email, isAdmin: u.isAdmin,
        createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
        activity: u.activity?.slice(-20) || []
    })));
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
    await User.deleteOne({ _id: req.params.id });
    await Item.deleteMany({ createdBy: req.params.id });
    res.json({ ok: true });
});

// Update user admin status
router.patch('/users/:id', requireAdmin, body('isAdmin').isBoolean(), validate, async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { $set: { isAdmin: !!req.body.isAdmin } });
    res.json({ ok: true });
});

// Get all users with safe data
router.get('/all-users', requireAdmin, async (req, res) => {
    try {
        const users = await User.find({})
            .select('-passwordHash -activity')
            .sort({ createdAt: -1 })
            .lean();

        const bannedDocs = await BannedUser.find({}).select('userId').lean();
        const bannedIds = new Set(bannedDocs.map(b => b.userId.toString()));

        const usersWithSafeData = users.map(u => ({
            id: u._id,
            email: u.email,
            isAdmin: u.isAdmin,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt,
            lastLoginAt: u.lastLoginAt,
            enrKurs: u.enrKurs,
            wpuKurs1: u.wpuKurs1,
            wpuKurs2: u.wpuKurs2,
            theater: u.theater,
            doneSetup: u.doneSetup,
            isBanned: bannedIds.has(u._id.toString())
        }));

        res.json(usersWithSafeData);
    } catch (err) {
        console.error('GET /api/admin/all-users error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Get user activity
router.get('/users/:id/activity', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('activity').lean();
        if (!user) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
        res.json(user.activity || []);
    } catch (err) {
        console.error('GET /api/admin/users/:id/activity error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Ban user
router.post('/users/:id/ban', requireAdmin, param('id').isMongoId(), validate, async (req, res) => {
    try {
        const userToBan = await User.findById(req.params.id).lean();
        if (!userToBan) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
        if (userToBan.isAdmin) return sendJSONError(res, 400, 'Du kannst keine Admins bannen.');

        await BannedUser.updateOne(
            { userId: userToBan._id },
            { $set: { bannedAt: new Date() } },
            { upsert: true }
        );

        await logActivity(req.user.sub, 'admin:ban:user', { targetUserId: userToBan._id });
        res.json({ ok: true, isBanned: true });
    } catch (err) {
        console.error('POST /api/admin/users/:id/ban error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Unban user
router.delete('/users/:id/ban', requireAdmin, param('id').isMongoId(), validate, async (req, res) => {
    try {
        const userId = req.params.id;
        await BannedUser.deleteOne({ userId: userId });

        await logActivity(req.user.sub, 'admin:unban:user', { targetUserId: userId });
        res.json({ ok: true, isBanned: false });
    } catch (err) {
        console.error('DELETE /api/admin/users/:id/ban error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Security report
router.post('/security-report', requireAdmin, async (req, res) => {
    try {
        const { data, error: dbError } = await supabase
            .from('auth_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(500);

        if (dbError) {
            console.error('Supabase DB Error:', dbError);
            return sendJSONError(res, 500, 'Fehler beim Abrufen der Logs von Supabase.');
        }

        if (!data || data.length === 0) {
            return sendJSONError(res, 404, 'Keine Auth-Logs gefunden.');
        }

        const logsJsonString = JSON.stringify(data, null, 2);
        const truncatedLogs = logsJsonString.length > 10000
            ? logsJsonString.substring(0, 10000) + "\n... (Daten zur Anzeige gekürzt)"
            : logsJsonString;

        const prompt = `
            Du bist ein leitender Cyber-Sicherheitsanalyst für eine Web-Anwendung.
            Deine Aufgabe ist es, einen Sicherheitsbericht basierend auf den folgenden 500 Authentifizierungs-Logs (Tabelle 'auth_logs') zu erstellen.
            Die Logs enthalten Felder wie 'ip', 'status' (success/failure), 'attempt_hash'(dies ist ein Hash des eingegebenen passworts), 'user_agent' und 'timestamp'.

            Hier sind die Rohdaten (möglicherweise gekürzt):
            ${truncatedLogs}

            ---
            AUFGABE:
            Erstelle einen detaillierten, aber prägnanten Sicherheitsbericht auf Deutsch.
            Struktur:
            1.  **Zusammenfassung:** Kurze Übersicht (z.B. "Sicherheitslage stabil", "Auffälligkeiten erkannt").
            2.  **Trendanalyse:** Gibt es Muster? (z.B. Uhrzeiten von Angriffen, Zunahme von 'failure'-Logs, auffällige User-Agents).
            3.  **Auffällige Aktivitäten & IPs:** Identifiziere spezifische Bedrohungen.
                * Gibt es IPs mit extrem vielen 'failure'-Logs (Brute-Force-Versuche)? Liste die Top 3 verdächtigsten IPs auf.
                * Gibt es IPs mit vielen verschiedenen User-Agents?
                * Gibt es verdächtige 'success'-Logs nach vielen 'failure'-Logs von derselben IP (möglicher erfolgreicher Einbruch)?
            4.  **Empfohlene Maßnahmen:** Konkrete, priorisierte Tipps. (z.B. "IP 1.2.3.4 auf Firewall blockieren", "Rate-Limiting für Login-Endpunkt /api/dashboard-check verschärfen").
            5.  **Sicherheitswarnungen:** (Nur falls akute, offensichtliche Bedrohungen wie ein erfolgreicher Einbruch klar erkennbar sind).

            Formatiere die gesamte Ausgabe als sauberes Markdown. Beginne direkt mit der ersten Überschrift (z.B. "## Zusammenfassung").
            Hinweis: Es handelt sich bei der Authentifizierung nicht um eine klassische mit Benutzerkonten o. Ä., sondern um eine äussere Authentifizierung einer Seite. Die Websitr ist also nur für bestimmte autorisierte Personen, die von den Administartoren das allgemeine Passwort erhalten haben. Es gibt also ncith mehrere Accounts, sondern nur ein Passwort, das eingegeben werden muss, um durch die Authentifizierung zum kommen. Die Attmept Hashes sind dabei hashes der versuchten Passwörter.  
        `;

        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const reportText = response.text();

        res.json({ ok: true, report: reportText });

    } catch (err) {
        console.error('Fehler beim Generieren des Sicherheitsberichts:', err);
        if (err.message.includes('API key not valid')) {
            return sendJSONError(res, 500, 'Gemini API Key ist ungültig.');
        }
        sendJSONError(res, 500, 'Fehler bei der Kommunikation mit der Gemini API.');
    }
});

// Get all reports
router.get('/reports', requireAdmin, async (req, res) => {
    try {
        const reports = await Report.find({})
            .sort({ reportedAt: -1 })
            .limit(100)
            .lean();

        res.json(reports);
    } catch (err) {
        console.error('GET /api/admin/reports error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

export default router;