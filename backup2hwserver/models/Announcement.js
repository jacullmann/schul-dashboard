// models/Announcement.js
import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema({
    title: String,
    content: String,
    color: { type: String, default: 'warn' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser' }
}, { timestamps: true });

export default mongoose.model('HwAnnouncement', AnnouncementSchema);