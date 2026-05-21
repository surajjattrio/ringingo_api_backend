import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { LeadsInQueueDocument, LeadsInQueueSchema } from "src/modules/lead-management/schema/leads-in-queue.schema";
import { LeadGroupDocument, LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { InboundCampaignDocument, InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { CommonFunctions } from "src/modules/common/common_functions";
import * as xml2js from "xml2js";

@Injectable()
export class RealtimeDashboardService {

    constructor(
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
        @InjectModel(LeadManagementSchema.name) private readonly leadManagement: Model<LeadManagementDocument>,
        @InjectModel(LeadsInQueueSchema.name) private readonly leadsInQueue: Model<LeadsInQueueDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly leadGroup: Model<LeadGroupDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outboundCampaign: Model<OutboundCampaignDocument>,
        @InjectModel(InboundCampaignSchema.name) private readonly inboundCampaign: Model<InboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blendedCampaign: Model<BlendedCampaignDocument>,
    ) { }

    /*
    @Usage              : Get lead group-wise realtime statistics
    @Param queryParams  : { tenant_uuid, campaign_uuid?, lead_group_uuid? }
    @return             : Lead group stats with summary totals
    */

    async getLeadGroupStats(queryParams) {
        try {
            const { tenant_uuid, campaign_uuid, lead_group_uuid } = queryParams;

            // Build match filter for lead_management
            const leadMatch: any = { tenant_uuid };
            if (campaign_uuid) leadMatch.campaign_uuid = campaign_uuid;
            if (lead_group_uuid) leadMatch.lead_group_uuid = lead_group_uuid;

            // Build match filter for leads_in_queue
            const queueMatch: any = { tenant_uuid };
            if (campaign_uuid) queueMatch.campaign_uuid = campaign_uuid;
            if (lead_group_uuid) queueMatch.lead_group_uuid = lead_group_uuid;

            // 1. Get all lead groups for this tenant (with optional filters)
            const leadGroupFilter: any = { tenant_uuid, status: "0" };
            if (lead_group_uuid) leadGroupFilter.uuid = lead_group_uuid;
            if (campaign_uuid) leadGroupFilter.campaign_uuid = campaign_uuid;

            const [leadGroups, fsCalls] = await Promise.all([
                this.leadGroup.find(leadGroupFilter, {
                    uuid: 1, name: 1, campaign_uuid: 1, totalLeadCount: 1, _id: 0
                }).lean().exec(),
                this.getFsLiveCalls()
            ]);

            if (!leadGroups || leadGroups.length === 0) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, {
                    leadGroupStats: [],
                });
            }

            const leadGroupUuids = leadGroups.map(lg => lg.uuid);
            const campaignUuids = [...new Set(leadGroups.map((lg: any) => lg.campaign_uuid).filter(Boolean))];

            // Ensure matches are restricted to the fetched groups if not already filtered
            if (!lead_group_uuid) {
                leadMatch.lead_group_uuid = { $in: leadGroupUuids };
                queueMatch.lead_group_uuid = { $in: leadGroupUuids };
            }

            // 2. Parallel fetch for all remaining data
            const [queueAgg, leadAgg, outboundCampaigns, blendedCampaigns, inboundCampaigns] = await Promise.all([
                this.leadsInQueue.aggregate([
                    { $match: queueMatch },
                    {
                        $group: {
                            _id: "$lead_group_uuid",
                            readyToDial: { $sum: { $cond: [{ $in: ["$lead_sent", ["1", 1]] }, 1, 0] } },
                            queueRemaining: { $sum: { $cond: [{ $in: ["$lead_sent", ["0", 0]] }, 1, 0] } },
                            uuids: { $push: "$lead_management_uuid" }
                        }
                    }
                ]).exec(),
                this.leadManagement.aggregate([
                    { $match: leadMatch },
                    {
                        $group: {
                            _id: "$lead_group_uuid",
                            totalUploaded: { $sum: 1 },
                            touchedLeads: {
                                $push: {
                                    $cond: [{ $gt: ["$call_count", 0] }, "$lead_management_uuid", "$$REMOVE"]
                                }
                            }
                        }
                    }
                ]).exec(),
                this.outboundCampaign.find({ uuid: { $in: campaignUuids } }, { uuid: 1, name: 1, _id: 0 }).lean().exec(),
                this.blendedCampaign.find({ uuid: { $in: campaignUuids } }, { uuid: 1, name: 1, _id: 0 }).lean().exec(),
                this.inboundCampaign.find({ uuid: { $in: campaignUuids } }, { uuid: 1, name: 1, _id: 0 }).lean().exec()
            ]);

            const groupQueueMap: any = {};
            const allQueueUuids = new Set<string>();
            const leadToGroupMap: any = {};
            
            queueAgg.forEach((item: any) => {
                const lgId = item._id;
                groupQueueMap[lgId] = {
                    active: item.readyToDial || 0,
                    waiting: item.queueRemaining || 0,
                    uuids: new Set(item.uuids || [])
                };

                (item.uuids || []).forEach((uuid: string) => {
                    allQueueUuids.add(uuid);
                    leadToGroupMap[uuid] = lgId;
                });
            });

            // 2.5 Fetch phone numbers for active leads to map FS calls
            const activeLeadUuids = [...allQueueUuids];
            const leadPhoneData = await this.leadManagement.find(
                { lead_management_uuid: { $in: activeLeadUuids } },
                { lead_management_uuid: 1, phone_number: 1, _id: 0 }
            ).lean().exec();

            const phoneToGroupMap: any = {};
            leadPhoneData.forEach(lp => {
                const lgId = leadToGroupMap[lp.lead_management_uuid as string];
                if (lgId && lp.phone_number) {
                    phoneToGroupMap[lp.phone_number.toString()] = lgId;
                }
            });

            const leadMap = {};
            leadAgg.forEach(item => {
                // EXCLUSIVE Finished: Touched but no longer in queue
                const finishedLeads = item.touchedLeads.filter(uuid => !allQueueUuids.has(uuid));
                
                leadMap[item._id] = {
                    totalUploaded: item.totalUploaded,
                    finishedCount: finishedLeads.length
                };
            });

            const campaignNameMap = {};
            [...outboundCampaigns, ...blendedCampaigns, ...inboundCampaigns].forEach((c: any) => {
                campaignNameMap[c.uuid] = c.name;
            });
            const groupFsMetrics: any = {};
            
            // Extract all lead_management_uuids from FS calls for group lookup
            const fsLeadUuids = new Set<string>();
            fsCalls.forEach(call => {
                const presenceDataStr = call.presence_data?.[0] || "";
                const match = presenceDataStr.match(/(?:lead_management_uuid)=([^,]+)/);
                if (match) fsLeadUuids.add(match[1]);
            });

            // Fetch any missing mappings from lead_management to handle all call types (inbound, manual, etc.)
            if (fsLeadUuids.size > 0) {
                const missingUuids = [...fsLeadUuids].filter(uuid => !leadToGroupMap[uuid]);
                if (missingUuids.length > 0) {
                    const additionalMappings = await this.leadManagement.find(
                        { lead_management_uuid: { $in: missingUuids }, tenant_uuid },
                        { lead_management_uuid: 1, lead_group_uuid: 1, _id: 0 }
                    ).lean().exec();
                    additionalMappings.forEach((m: any) => {
                        leadToGroupMap[m.lead_management_uuid as string] = m.lead_group_uuid;
                    });
                }
            }
            // Build a set of all b_uuids from inbound legs
            const bridgedBUuids = new Set<string>();
            fsCalls.forEach(call => {
                const direction = (call.direction?.[0] || "").toLowerCase();
                const bUuid = call.b_uuid?.[0] || "";
                if (direction === "inbound" && bUuid) {
                    bridgedBUuids.add(bUuid);
                }
            });

            console.log("fsCalls*********", fsCalls);
            
            fsCalls.forEach(call => {
                const callUuid = call.uuid?.[0] || "";
                const direction = (call.direction?.[0] || "").toLowerCase();

                // Skip B-leg if it's already represented by an inbound A-leg
                if (direction === "outbound" && bridgedBUuids.has(callUuid)) return;
                const presenceDataStr = call.presence_data?.[0] || "";
                
                // Parse presence_data variables
                const presenceVars: any = {};
                presenceDataStr.split(",").forEach(pair => {
                    const [key, val] = pair.split("=");
                    if (key) presenceVars[key.trim()] = val?.trim();;
                });
                
                console.log("Parsed Presence Vars:", presenceVars);

                // Filter by tenant
                const callTenantUuid = presenceVars.tenant || "";
                if (tenant_uuid !== callTenantUuid) return;

                // Determine category
                const state = (call.callstate?.[0] || "").toUpperCase();
                const bCallstate = (call.b_callstate?.[0] || call.b_state?.[0] || "").toUpperCase();
                const bUuid = call.b_uuid?.[0] || "";

                // For inbound: A-leg shows ACTIVE early, but if B-leg is ringing, it's still dialing
                const isDialing =
                    ["DOWN", "DIALING", "RINGING", "EARLY"].includes(state) ||
                    ["DOWN", "DIALING", "RINGING", "EARLY"].includes(bCallstate) ||
                    // KEY FIX: inbound A-leg is ACTIVE but agent B-leg hasn't answered yet
                    (direction === "inbound" && ["ACTIVE", "CS_EXECUTE"].includes(state) && bUuid === "");

                // Active only if B-leg also exists and is connected
                const isActive =
                    !isDialing &&
                    ["ACTIVE", "CONNECTED", "HELD"].includes(state) &&
                    bUuid !== ""; // B-leg must exist and be bridged
                if (!isDialing && !isActive) return;

                // Identify lead group from FS metadata or lookup via lead_management_uuid/lead_uuid or phone number
                let lgId = presenceVars.lead_group_uuid || leadToGroupMap[presenceVars.lead_management_uuid] || leadToGroupMap[presenceVars.lead_uuid];
                if (!lgId) {
                    const dest = (call.dest?.[0] || "").toString();
                    const b_dest = (call.b_dest?.[0] || "").toString();
                    // Try exact match or suffix match for phone numbers
                    lgId = phoneToGroupMap[dest] || phoneToGroupMap[b_dest];
                    
                    // Optional: Add fuzzy/suffix matching if needed for country codes
                    if (!lgId) {
                        for (const phone in phoneToGroupMap) {
                            if (dest.endsWith(phone) || b_dest.endsWith(phone)) {
                                lgId = phoneToGroupMap[phone];
                                break;
                            }
                        }
                    }
                }

                if (lgId) {
                    if (!groupFsMetrics[lgId]) groupFsMetrics[lgId] = { dialing: 0, activeCalls: 0 };
                    if (isDialing) groupFsMetrics[lgId].dialing++;
                    else if (isActive) groupFsMetrics[lgId].activeCalls++;
                }
            });

            // 5. Assemble per-group stats
            const leadGroupStats = leadGroups.map((lg: any) => {
                const leadInfo = leadMap[lg.uuid] || { totalUploaded: 0, finishedCount: 0 };
                const queueInfo = groupQueueMap[lg.uuid] || { active: 0, waiting: 0 };
                const fsMetrics = groupFsMetrics[lg.uuid] || { dialing: 0, activeCalls: 0 };

                const totalUploaded = leadInfo.totalUploaded || Number(lg.totalLeadCount) || 0;
                
                // Ready to Dial = Leads actively picked by dialer but not yet finished (lead_sent "1")
                const readyToDial = queueInfo.active;
                
                // Queue Remaining = Leads waiting in the queue to be sent (lead_sent "0")
                const queueRemaining = queueInfo.waiting;
                
                // Total Dialled = Leads that have finished their attempts
                const totalDialled = leadInfo.finishedCount;
                
                // Calculate derived metrics based on user terminology
                const unprocessed = totalUploaded - (leadInfo.finishedCount + readyToDial + queueRemaining);
                const connected = leadInfo.finishedCount;
                const notConnected = Math.max(0, unprocessed);
                
                return {
                    lead_group_uuid: lg.uuid,
                    lead_group_name: lg.name || "Unknown",
                    campaign_uuid: lg.campaign_uuid || "",
                    campaign_name: campaignNameMap[lg.campaign_uuid] || "N/A",
                    totalUploaded,
                    totalDialled: connected + notConnected, // Total Dialled = Connected + Not Connected
                    connected,
                    notConnected,
                    readyToDial,
                    queueRemaining,
                    dialing: fsMetrics.dialing,
                    activeCalls: fsMetrics.activeCalls
                };
            });

            // 6. Compute summary totals
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, {
                leadGroupStats
            });

        } catch (error) {
            Logger.error(`[RealtimeDashboard] getLeadGroupStats error: ${error.message}`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.INTERNAL_SERVER_ERROR, "Error fetching lead group stats");
        }
    }

    async getFsLiveCalls(): Promise<any[]> {
        const parser = new xml2js.Parser({ attrkey: "ATTR" });
        return new Promise(async (resolve) => {
            try {
                const conn = await this.commonFn.fetchFsConnection();
                if (!conn) return resolve([]);

                conn.api("show calls as xml", (res) => {
                    const xml = res.getBody().trim();
                    if (!xml || !xml.includes("<result")) {
                        return resolve([]);
                    }
                    parser.parseString(xml, (err, result) => {
                        if (err) return resolve([]);
                        const rows = result?.result?.row || [];
                        resolve(rows);
                    });
                });
            } catch (err) {
                Logger.warn(`[RealtimeDashboard] FS connection error: ${err.message}`);
                resolve([]);
            }
        });
    }

}
