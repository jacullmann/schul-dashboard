// models/Subject.js
import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true }
}, { timestamps: true });

const Subject = mongoose.model('HwSubject', SubjectSchema);

// Default Subjects seed
const DEFAULT_SUBJECTS = [
    'Mathe', 'Deutsch', 'Englisch', 'Französisch', 'Erdkunde', 'Sport',
    'Biologie', 'Chemie', 'Physik', 'Ethik', 'Politik', 'Musik',
    'Enrichment', 'WPU', 'Theater', 'Latein'
];

export async function ensureSubjects() {
    for (const s of DEFAULT_SUBJECTS) {
        await Subject.updateOne({ name: s }, { $set: { name: s } }, { upsert: true });
    }
}

export default Subject;