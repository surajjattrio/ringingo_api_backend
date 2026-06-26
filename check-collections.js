const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
    const uri = process.env.MONGODB_URI || process.env.DB_URL || process.env.DATABASE_URL || process.env.MONGO_URI;
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name).sort();
    console.log('\n========== ALL COLLECTIONS ==========');
    names.forEach(n => console.log(' -', n));

    // Check any collection with 'sheet' or 'tab' or 'lead' in the name
    const relevant = names.filter(n =>
        n.toLowerCase().includes('sheet') ||
        n.toLowerCase().includes('tab') ||
        n.toLowerCase().includes('lead') ||
        n.toLowerCase().includes('google')
    );

    console.log('\n========== RELEVANT COLLECTIONS WITH COUNTS ==========');
    for (const col of relevant) {
        const count = await db.collection(col).countDocuments({});
        const sample = await db.collection(col).findOne({});
        const keys = sample ? Object.keys(sample).slice(0, 8).join(', ') : '(empty)';
        console.log(`  ${col}: ${count} docs | fields: ${keys}`);
    }

    await mongoose.disconnect();
    console.log('\nDone.');
}

checkCollections().catch(e => console.error('Error:', e.message));
