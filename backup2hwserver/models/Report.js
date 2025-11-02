// models/Report.js
import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
    itemTitle: { type: String, required: true },
    reason: { type: String },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, default: null },
    reporterEmail: { type: String, default: 'anonymous' },
    reportedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('HwReport', ReportSchema);