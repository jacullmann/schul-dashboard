// utils/activityLogger.js
import { User } from '../models/index.js';

export async function logActivity(userId, type, meta = {}) {
    await User.findByIdAndUpdate(userId, {
        $push: { activity: { at: new Date(), type, meta } }
    });
}