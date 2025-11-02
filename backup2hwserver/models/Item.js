// models/Item.js
import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['HAUSAUFGABE', 'DALTON', 'PRUEFUNG'], index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    images: [{
        url: String,
        thumbUrl: String,
        publicId: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser' }
    }],
    dueDate: { type: Date, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true }
}, { timestamps: true });

export default mongoose.model('HwItem', ItemSchema);