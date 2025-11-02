// purgeDb.js

// Stellt sicher, dass Umgebungsvariablen wie MONGO_URI geladen werden (wie in server.js)
import 'dotenv/config';
import mongoose from 'mongoose';

// Annahme: Ihre MongoDB URI ist in der Umgebungsvariable gespeichert
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
// Die Collection, die Sie löschen möchten (hwitems)
const COLLECTION_NAME = 'hwitems';
// Die Datenbank, die Sie im URI verwenden (test)
const DATABASE_NAME = 'test';

async function purgeCollection() {
    if (!MONGO_URI) {
        console.error("❌ FEHLER: Umgebungsvariable MONGO_URI (oder MONGODB_URI) ist nicht gesetzt. Bitte prüfen Sie Ihre Konfiguration.");
        process.exit(1);
    }

    try {
        console.log(`🛠️ Starte Verbindung zu MongoDB...`);
        await mongoose.connect(MONGO_URI);
        console.log("✅ Erfolgreich verbunden.");

        // Greift auf die spezifische Collection in der 'test' Datenbank zu
        const db = mongoose.connection.useDb(DATABASE_NAME, { useCache: true });
        const collection = db.collection(COLLECTION_NAME);

        console.log(`🗑️ Lösche ALLE Dokumente aus der Collection '${DATABASE_NAME}.${COLLECTION_NAME}'...`);

        // Führt den Löschvorgang aus
        const result = await collection.deleteMany({});

        console.log(`🎉 BEREINIGUNG ABGESCHLOSSEN: ${result.deletedCount} Dokumente erfolgreich gelöscht.`);

    } catch (error) {
        console.error("❌ FEHLER während der Datenbankoperation:", error);
        process.exit(1);
    } finally {
        // Verbindung trennen
        await mongoose.disconnect();
        console.log("👋 Verbindung getrennt. Skript beendet.");
        process.exit(0);
    }
}

purgeCollection();