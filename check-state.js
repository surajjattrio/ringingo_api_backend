const mongoose = require('mongoose');
require('dotenv').config();

async function checkState() {
    const uri = process.env.MONGODB_URI || process.env.DB_URL || process.env.DATABASE_URL || process.env.MONGO_URI;
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // ── Configs ──────────────────────────────────────────────────────────────
    const configs = await db.collection('google_sheet_config').find({ isActive: true }).toArray();
    console.log('\n========== GOOGLE SHEET CONFIGS (' + configs.length + ') ==========');
    for (const c of configs) {
        console.log({
            uuid: c.uuid,
            sheet_id: c.sheet_id,
            isActive: c.isActive,
            active_tab_gid: c.active_tab_gid,
            all_tabs_exhausted: c.all_tabs_exhausted,
            campaign_uuid: c.campaign_uuid,
            credential_uuid: c.credential_uuid,
        });
    }

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const tabs = await db.collection('google_sheet_tabs').find({}).sort({ config_uuid: 1, position: 1 }).toArray();
    console.log('\n========== GOOGLE SHEET TABS (' + tabs.length + ') ==========');
    for (const t of tabs) {
        console.log({
            config_uuid: t.config_uuid,
            tab_name: t.tab_name,
            sheet_gid: t.sheet_gid,
            position: t.position,
            status: t.status,
            lead_group_uuid: t.lead_group_uuid,
            total_leads: t.total_leads,
            remaining_leads: t.remaining_leads,
        });
    }

    // ── Lead Groups ──────────────────────────────────────────────────────────
    const lgs = await db.collection('lead_groups').find({}).sort({ createdAt: -1 }).limit(20).toArray();
    console.log('\n========== LEAD GROUPS (latest 20) (' + lgs.length + ') ==========');
    for (const g of lgs) {
        console.log({ uuid: g.uuid, name: g.name, campaign_uuid: g.campaign_uuid, totalLeadCount: g.totalLeadCount });
    }

    // ── Lead counts per group ─────────────────────────────────────────────────
    const tabsWithGroup = tabs.filter(t => t.lead_group_uuid);
    if (tabsWithGroup.length > 0) {
        console.log('\n========== LEAD COUNTS PER TAB GROUP ==========');
        for (const t of tabsWithGroup) {
            const lmCount = await db.collection('lead_managements').countDocuments({ lead_group_uuid: t.lead_group_uuid });
            const queueCount = await db.collection('leads_in_queues').countDocuments({ lead_group_uuid: t.lead_group_uuid });
            console.log({
                tab_name: t.tab_name,
                config_uuid: t.config_uuid,
                lead_group_uuid: t.lead_group_uuid,
                status: t.status,
                lead_management_count: lmCount,
                leads_in_queue_count: queueCount,
            });
        }
    }

    await mongoose.disconnect();
    console.log('\n========== DIAGNOSIS COMPLETE ==========\n');
}

checkState().catch(e => console.error('Error:', e.message));
