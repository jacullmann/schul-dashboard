// models/KeepChecked.js
import mongoose from 'mongoose';

const KeepCheckedSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwItem', index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, required: true },
    checkedAt: { type: Date, default: Date.now }
}, { timestamps: false });

KeepCheckedSchema.index({ itemId: 1, userId: 1 }, { unique: true });

export default mongoose.model('HwKeepChecked', KeepCheckedSchema);