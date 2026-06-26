const mongoose = require('mongoose');
const { JWT } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

async function diagnose() {
    const uri = process.env.MONGODB_URI || process.env.DB_URL || process.env.DATABASE_URL || process.env.MONGO_URI;
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const configs = await db.collection('google_sheet_config').find({ all_tabs_exhausted: false, isActive: true }).toArray();

    for (const cfg of configs) {
        const cred = await db.collection('google_credentials').findOne({ uuid: cfg.credential_uuid });
        if (!cred) {
            console.log('NO CREDENTIAL found for config', cfg.uuid);
            continue;
        }

        const scopesRaw = cred.scopes;
        let scopesArray;
        if (Array.isArray(scopesRaw)) {
            scopesArray = scopesRaw;
        } else if (typeof scopesRaw === 'string') {
            scopesArray = scopesRaw.split(',').map(s => s.trim()).filter(Boolean);
        } else {
            scopesArray = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'];
        }

        const privateKey = cred.private_key.replace(/\\n/g, '\n');
        let tokenOk = false;
        let apiResult = '';

        try {
            const jwt = new JWT({ email: cred.client_email, key: privateKey, scopes: scopesArray });
            const token = await jwt.authorize();
            tokenOk = !!(token && token.access_token);

            if (tokenOk) {
                const res = await axios.get(
                    'https://sheets.googleapis.com/v4/spreadsheets/' + cfg.sheet_id,
                    {
                        headers: { Authorization: 'Bearer ' + token.access_token },
                        params: { fields: 'sheets.properties(title)' },
                        timeout: 10000,
                    }
                );
                const tabs = res.data.sheets.map(s => s.properties.title);
                apiResult = 'SUCCESS — Tabs found: [' + tabs.join(', ') + ']';
            }
        } catch (e) {
            apiResult = 'FAILED: ' + e.message;
        }

        console.log('───────────────────────────────────────────');
        console.log('Config UUID  :', cfg.uuid);
        console.log('Sheet ID     :', cfg.sheet_id);
        console.log('Credential   :', cred.uuid);
        console.log('Email        :', cred.client_email);
        console.log('Scopes Type  :', Array.isArray(scopesRaw) ? 'ARRAY (was crashing)' : typeof scopesRaw);
        console.log('Auth Token OK:', tokenOk);
        console.log('API Result   :', apiResult);
    }

    await mongoose.disconnect();
    console.log('───────────────────────────────────────────');
    console.log('Diagnosis complete.');
}

diagnose().catch(e => console.error('Error:', e.message));
