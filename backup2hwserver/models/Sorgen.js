// models/Sorgen.js
import mongoose from 'mongoose';

const SorgenSchema = new mongoose.Schema({
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Sorgen', SorgenSchema);