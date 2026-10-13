import { HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Connection, createConnection, Types } from "mongoose";
import { randomUUID } from "crypto";
import axios from "axios";

// SCHEMAS & DOCUMENTS
import { ServerConfigDocument, ServerConfigSchema } from "../schema/server-config.schema";
import { ServerSyncHistoryDocument, ServerSyncHistorySchema } from "../schema/server-sync-history.schema";
import { RolesDocument, RolesSchema, rolesSchema } from "src/modules/roles/schema/roles-schema";
import { TenantDocument, TenantSchema, tenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserRoleDocument, UserRoleSchema, userRoleSchema } from "src/modules/user-role/schema/user-role.schema";
import { UserGroupDocument, UserGroupSchema, userGroupSchema } from "src/modules/user-group/schema/user-group.schema";
import { DidDocument, DidSchema, didSchema } from "src/modules/did/schema/did.schema";
import { AdminDidDocument, AdminDidSchema, admindidSchema } from "src/modules/admin-did/schema/admin-did.schema";
import { TrunkDocument, TrunkSchema, trunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { OutgoingRulesDocument, OutgoingRulesSchema, outgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";
import { BreakcodeDocument, BreakcodeSchema, breakcodeSchema } from "src/modules/breakcode/schema/breakcode.schema";
import { DispositionDocument, DispositionSchema, dispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { OutboundCampaignDocument, OutboundCampaignSchema, outboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { InboundCampaignDocument, InboundCampaignSchema, inboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema, blendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { LeadGroupDocument, LeadGroupSchema, leadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { UserDocument, UserSchema, userSchema } from "src/modules/user/schema/user.schema";
import { ExtensionDocument, ExtensionSchema, extensionSchema } from "src/modules/extension/schema/extension.schema";
import { AdminIpMappingDocument, AdminIpMappingSchema, adminipMappingSchema } from "src/modules/admin-ip-mapping/schema/admin-ip-mapping.schema";
import { IpMappingDocument, IpMappingSchema, ipMappingSchema } from "src/modules/ip-mapping/schema/ip-mapping.schema";
import { VoiceBroadcastDocument, VoiceBroadcastSchema, voiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";

import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { DuplicateStrategy, ExecuteSyncDto, ExportDataDto, ImportDataDto, PreviewSyncDto, SyncModuleType, ValidatePipelineDto } from "../dto/server-sync.dto";

// Ordered sequence of synchronization modules
export const SYNC_DEPENDENCY_ORDER: SyncModuleType[] = [
    SyncModuleType.TENANT_ROLE,
    SyncModuleType.TENANT,
    SyncModuleType.USER_ROLE,
    SyncModuleType.USER_GROUP,
    SyncModuleType.DID,
    SyncModuleType.IP_MAPPING,
    SyncModuleType.TRUNK,
    SyncModuleType.OUTGOING_RULES,
    SyncModuleType.BREAK_CODE,
    SyncModuleType.DISPOSITION,
    SyncModuleType.CAMPAIGN,
    SyncModuleType.CAMPAIGN_LEAD_GROUP,
    SyncModuleType.USERS,
    SyncModuleType.SIP_DEVICES,
    SyncModuleType.VOICE_BROADCAST,
];

export const MODULE_DISPLAY_NAMES: Record<SyncModuleType, string> = {
    [SyncModuleType.TENANT_ROLE]: "Tenant Role",
    [SyncModuleType.TENANT]: "Tenant",
    [SyncModuleType.USER_ROLE]: "User Role",
    [SyncModuleType.USER_GROUP]: "User Group",
    [SyncModuleType.DID]: "DID Numbers",
    [SyncModuleType.IP_MAPPING]: "IP Mapping",
    [SyncModuleType.TRUNK]: "SIP Trunk",
    [SyncModuleType.OUTGOING_RULES]: "Outgoing Rules",
    [SyncModuleType.BREAK_CODE]: "Break Code",
    [SyncModuleType.DISPOSITION]: "Disposition",
    [SyncModuleType.CAMPAIGN]: "Campaign",
    [SyncModuleType.CAMPAIGN_LEAD_GROUP]: "Campaign Lead Group",
    [SyncModuleType.USERS]: "Users",
    [SyncModuleType.SIP_DEVICES]: "SIP Devices",
    [SyncModuleType.USER_AND_SIP_DEVICES]: "Users & SIP Devices",
    [SyncModuleType.VOICE_BROADCAST]: "Voice Broadcast",
};

@Injectable()
export class ServerSyncService implements OnModuleInit {
    private readonly logger = new Logger(ServerSyncService.name);
    private readonly connectionPool = new Map<string, Connection>();
    // Per-sync-run (keyed by idMap) record of target UUIDs re-keyed by OVERWRITE: new uuid -> previous target uuid
    private readonly overwrittenUuidAliases = new WeakMap<Record<string, string>, Record<string, string>>();

    constructor(
        @InjectModel(ServerConfigSchema.name) private readonly serverConfigModel: Model<ServerConfigDocument>,
        @InjectModel(ServerSyncHistorySchema.name) private readonly syncHistoryModel: Model<ServerSyncHistoryDocument>,
        @InjectModel(RolesSchema.name) private readonly rolesModel: Model<RolesDocument>,
        @InjectModel(TenantSchema.name) private readonly tenantModel: Model<TenantDocument>,
        @InjectModel(UserRoleSchema.name) private readonly userRoleModel: Model<UserRoleDocument>,
        @InjectModel(UserGroupSchema.name) private readonly userGroupModel: Model<UserGroupDocument>,
        @InjectModel(DidSchema.name) private readonly didModel: Model<DidDocument>,
        @InjectModel(AdminDidSchema.name) private readonly adminDidModel: Model<AdminDidDocument>,
        @InjectModel(TrunkSchema.name) private readonly trunkModel: Model<TrunkDocument>,
        @InjectModel(OutgoingRulesSchema.name) private readonly outgoingRulesModel: Model<OutgoingRulesDocument>,
        @InjectModel(BreakcodeSchema.name) private readonly breakcodeModel: Model<BreakcodeDocument>,
        @InjectModel(DispositionSchema.name) private readonly dispositionModel: Model<DispositionDocument>,
        @InjectModel(OutboundCampaignSchema.name) private readonly outboundCampaignModel: Model<OutboundCampaignDocument>,
        @InjectModel(InboundCampaignSchema.name) private readonly inboundCampaignModel: Model<InboundCampaignDocument>,
        @InjectModel(BlendedCampaignSchema.name) private readonly blendedCampaignModel: Model<BlendedCampaignDocument>,
        @InjectModel(LeadGroupSchema.name) private readonly leadGroupModel: Model<LeadGroupDocument>,
        @InjectModel(UserSchema.name) private readonly userModel: Model<UserDocument>,
        @InjectModel(ExtensionSchema.name) private readonly extensionModel: Model<ExtensionDocument>,
        @InjectModel(AdminIpMappingSchema.name) private readonly adminIpMappingModel: Model<AdminIpMappingDocument>,
        @InjectModel(IpMappingSchema.name) private readonly ipMappingModel: Model<IpMappingDocument>,
        @InjectModel(VoiceBroadcastSchema.name) private readonly voiceBroadcastModel: Model<VoiceBroadcastDocument>,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    async onModuleInit() {
        await this.seedDefaultServerConfigurations();
    }

    /**
     * Auto-seed default server configurations.
     * Inserts missing server configurations and updates existing configurations
     * when the default configuration is changed.
     */
    async seedDefaultServerConfigurations(): Promise<void> {
        try {
            // const count = await this.serverConfigModel.countDocuments().exec();
            // if (count > 0) {
            //     this.logger.log(`Server configurations already exist in database (${count} records). Preserving database settings.`);
            //     return;
            // }

            // this.logger.log("Server configurations collection is empty. Seeding initial server records from MongoDB configurations...");            
            this.logger.log("Syncing default server configurations...");

            const defaultConfigs = [
                {
                    server_key: "system",
                    server_name: "System Server",
                    mongo_uri: "mongodb://127.0.0.1:27017/db_pbxcc?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.5.5",
                    is_active: true,
                    is_system: true,
                    description: "Local System FreeSWITCH / PBX DB",
                },
                {
                    server_key: "development",
                    server_name: "Development Server",
                    mongo_uri: "mongodb://db_pbxcc:jEEBhh3bh8p@10.180.67.151:27017/db_pbxcc?authSource=db_pbxcc",
                    is_active: true,
                    is_system: false,
                    description: "Primary Development Database",
                },
                {
                    server_key: "local",
                    server_name: "Local Server",
                    mongo_uri: "mongodb://callcenter_user:5XmM30324JaQk6F0Y@10.180.10.133:27017/db_pbxcc",
                    is_active: true,
                    is_system: false,
                    description: "Call Center Local Cluster DB",
                },
                {
                    server_key: "server_224",
                    server_name: "224 Server",
                    mongo_uri: "mongodb://db_pbxcc:jEEBhh3bh8p@40.81.228.224:27017/db_pbxcc?authSource=admin",
                    is_active: true,
                    is_system: false,
                    description: "Azure Cloud 224 Database",
                },
                {
                    server_key: "ovh",
                    server_name: "Ovh Server",
                    mongo_uri: "mongodb://db_pbxcc:xCnk271FkHTbM@148.113.37.25:3870/admin",
                    is_active: true,
                    is_system: false,
                    description: "OVH Cloud DB Instance",
                },
                {
                    server_key: "ishan",
                    server_name: "Ishan Server",
                    mongo_uri: "mongodb://db_pbxcc:qxR3aghkOaZToadsJed3q@103.36.121.197:3815/db_pbxcc?authSource=db_pbxcc",
                    is_active: true,
                    is_system: false,
                    description: "Ishan Datacenter DB",
                },
                {
                    server_key: "handicraft",
                    server_name: "Handicraft Server",
                    mongo_uri: "mongodb://db_pbxcc:N5cwRyYwDrbVnvF@10.180.10.152:27017/admin",
                    is_active: true,
                    is_system: false,
                    description: "Handicraft Server Instance DB",
                },
            ];

            const operations = defaultConfigs.map((config) => ({
                updateOne: {
                    filter: { server_key: config.server_key },
                    update: {
                        $set: {
                            server_name: config.server_name,
                            mongo_uri: config.mongo_uri,
                            is_active: config.is_active,
                            is_system: config.is_system,
                            description: config.description,
                        },
                        $setOnInsert: { server_key: config.server_key },
                    },
                    upsert: true,
                },
            }));

            const result = await this.serverConfigModel.bulkWrite(operations);
            this.logger.log(`Server configurations sync completed. Inserted: ${result.upsertedCount}, Updated: ${result.modifiedCount}`);
        } catch (err: any) {
            this.logger.error("Failed to seed default server configurations", err);
        }
    }

    /**
     * Sanitize MongoDB URI for safe logging and client display (removes auth credentials)
     */
    sanitizeUriForDisplay(uri: string): string {
        if (!uri) return "";
        try {
            const afterAt = uri.includes("@") ? uri.split("@")[1] : uri.replace("mongodb://", "").replace("mongodb+srv://", "");
            return afterAt.split("?")[0];
        } catch {
            return "MongoDB Instance";
        }
    }

    /**
     * Extract host and port cleanly from MongoDB URI (e.g. 148.113.37.25:3870, 10.180.67.151:27017)
     */
    extractHostPort(uri: string): string {
        if (!uri) return "";
        try {
            const sanitized = this.sanitizeUriForDisplay(uri);
            return sanitized.split("/")[0] || sanitized;
        } catch {
            return "";
        }
    }

    /**
     * Dynamically detect and identify the current server associated with this running backend/session strictly from active database records
     */
    async detectCurrentServer(): Promise<{ server_key: string; server_name: string; id: string; name: string; ip: string; isCurrent: boolean; description: string }> {
        const allConfigs = await this.serverConfigModel.find({ is_active: true }).lean().exec();
        if (!allConfigs || allConfigs.length === 0) {
            throw new Error("No active server configurations found in MongoDB.");
        }

        // 1. Check explicit environment override matching an active database record
        const envServerKey = (process.env.CURRENT_SERVER_KEY || process.env.SERVER_ID || process.env.SERVER_KEY || "").trim().toLowerCase();
        if (envServerKey) {
            const found = allConfigs.find(
                (s) => s.server_key.toLowerCase() === envServerKey || s.server_name.toLowerCase() === envServerKey
            );
            if (found) {
                return {
                    server_key: found.server_key,
                    server_name: found.server_name,
                    id: found.server_key,
                    name: found.server_name,
                    ip: this.extractHostPort(found.mongo_uri),
                    isCurrent: true,
                    description: found.description || found.server_name,
                };
            }
        }

        // 2. Check active MONGO_URI in process.env matching an active database record
        const activeMongoUri = (process.env.MONGO_URI || "").trim();
        if (activeMongoUri) {
            const activeSanitized = this.sanitizeUriForDisplay(activeMongoUri);
            const activeHostPort = this.extractHostPort(activeMongoUri);
            for (const s of allConfigs) {
                const srvSanitized = this.sanitizeUriForDisplay(s.mongo_uri);
                const srvHostPort = this.extractHostPort(s.mongo_uri);
                if (
                    activeMongoUri === s.mongo_uri?.trim() ||
                    (activeSanitized && srvSanitized && activeSanitized === srvSanitized) ||
                    (activeHostPort && srvHostPort && activeHostPort === srvHostPort) ||
                    (activeHostPort && s.mongo_uri && s.mongo_uri.includes(activeHostPort))
                ) {
                    return {
                        server_key: s.server_key,
                        server_name: s.server_name,
                        id: s.server_key,
                        name: s.server_name,
                        ip: srvHostPort || this.extractHostPort(s.mongo_uri),
                        isCurrent: true,
                        description: s.description || s.server_name,
                    };
                }
            }
        }

        // 3. Fallback to the first active server record configured in MongoDB
        const firstActive = allConfigs[0];
        return {
            server_key: firstActive.server_key,
            server_name: firstActive.server_name,
            id: firstActive.server_key,
            name: firstActive.server_name,
            ip: this.extractHostPort(firstActive.mongo_uri),
            isCurrent: true,
            description: firstActive.description || firstActive.server_name,
        };
    }

    /**
     * Resolve server identifier strictly from active MongoDB server configuration
     */
    async resolveMongoUri(serverKey?: string): Promise<{ uri: string; name: string; server_key: string }> {
        const currentServer = await this.detectCurrentServer();
        const targetKey = serverKey && serverKey.trim() !== "" ? serverKey.trim() : currentServer.server_key;

        // 1. Query database collection for active servers
        let dbServer = await this.serverConfigModel.findOne({
            $or: [
                { server_key: targetKey.toLowerCase() },
                { server_key: targetKey },
                { server_name: new RegExp(`^${targetKey}$`, "i") },
            ],
            is_active: true,
        }).lean().exec();

        // 2. If not matched in active, check configured servers by key/name
        if (!dbServer) {
            dbServer = await this.serverConfigModel.findOne({
                $or: [
                    { server_key: targetKey.toLowerCase() },
                    { server_key: targetKey },
                    { server_name: new RegExp(`^${targetKey}$`, "i") },
                ],
            }).lean().exec();
        }

        if (dbServer && dbServer.mongo_uri) {
            return {
                uri: dbServer.mongo_uri,
                name: dbServer.server_name,
                server_key: dbServer.server_key,
            };
        }

        // 3. If not matched by key/name, check by host/IP substring against all configured servers
        const allConfigs = await this.serverConfigModel.find({}).lean().exec();
        const matchedByIp = allConfigs.find((s) => {
            const hp = this.extractHostPort(s.mongo_uri);
            return hp === targetKey || hp.split(":")[0] === targetKey || s.mongo_uri.includes(targetKey);
        });

        if (matchedByIp && matchedByIp.mongo_uri) {
            return {
                uri: matchedByIp.mongo_uri,
                name: matchedByIp.server_name,
                server_key: matchedByIp.server_key,
            };
        }

        throw new Error(`Server configuration '${targetKey}' is not configured in MongoDB.`);
    }

    /**
     * Establish or reuse a cached MongoDB Connection
     */
    async getMongoConnection(serverKeyOrUri?: string): Promise<Connection> {
        const { uri, name } = await this.resolveMongoUri(serverKeyOrUri);
        if (!uri) {
            throw new Error(`Unable to resolve MongoDB connection URI for server '${serverKeyOrUri}'`);
        }

        if (this.connectionPool.has(uri)) {
            const cached = this.connectionPool.get(uri)!;
            if (cached.readyState === 1) {
                return cached;
            }
        }

        this.logger.log(`Establishing direct MongoDB connection to [${name}]...`);
        const conn = createConnection(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });

        await conn.asPromise();
        this.connectionPool.set(uri, conn);
        return conn;
    }

    /**
     * Helper to safely register/retrieve Model on dynamic Connection
     */
    private getConnModel(conn: Connection, name: string, schema: any): Model<any> {
        return (conn.models[name] as Model<any>) || conn.model(name, schema);
    }

    /**
     * Get all domain models bound to a given MongoDB Connection (scoped to db_pbxcc)
     */
    getModuleModels(conn: Connection): Record<string, Model<any>> {
        return {
            roles: this.getConnModel(conn, RolesSchema.name, rolesSchema),
            tenant: this.getConnModel(conn, TenantSchema.name, tenantSchema),
            userRole: this.getConnModel(conn, UserRoleSchema.name, userRoleSchema),
            userGroup: this.getConnModel(conn, UserGroupSchema.name, userGroupSchema),
            did: this.getConnModel(conn, DidSchema.name, didSchema),
            adminDid: this.getConnModel(conn, AdminDidSchema.name, admindidSchema),
            trunk: this.getConnModel(conn, TrunkSchema.name, trunkSchema),
            outgoingRules: this.getConnModel(conn, OutgoingRulesSchema.name, outgoingRulesSchema),
            breakcode: this.getConnModel(conn, BreakcodeSchema.name, breakcodeSchema),
            disposition: this.getConnModel(conn, DispositionSchema.name, dispositionSchema),
            outboundCampaign: this.getConnModel(conn, OutboundCampaignSchema.name, outboundCampaignSchema),
            inboundCampaign: this.getConnModel(conn, InboundCampaignSchema.name, inboundCampaignSchema),
            blendedCampaign: this.getConnModel(conn, BlendedCampaignSchema.name, blendedCampaignSchema),
            leadGroup: this.getConnModel(conn, LeadGroupSchema.name, leadGroupSchema),
            user: this.getConnModel(conn, UserSchema.name, userSchema),
            extension: this.getConnModel(conn, ExtensionSchema.name, extensionSchema),
            adminIpMapping: this.getConnModel(conn, AdminIpMappingSchema.name, adminipMappingSchema),
            ipMapping: this.getConnModel(conn, IpMappingSchema.name, ipMappingSchema),
            voiceBroadcast: this.getConnModel(conn, VoiceBroadcastSchema.name, voiceBroadcastSchema),
        };
    }

    /**
     * Get list of available active servers from MongoDB with dynamic Current Server detection
     */
    async getAvailableServers(): Promise<any> {
        try {
            const currentServer = await this.detectCurrentServer();
            const dbServers = await this.serverConfigModel.find({
                is_active: true,
            }).lean().exec();

            const servers: Array<{
                server_key: string;
                server_name: string;
                id: string;
                name: string;
                ip: string;
                prefix?: string;
                status?: string;
                isLocal?: boolean;
                isCurrent?: boolean;
                is_active?: boolean;
                description?: string;
            }> = [];

            for (const s of dbServers) {
                // Strictly skip if is_active is false or missing
                if (s.is_active === false || (s as any).is_active === "false" || !s.is_active) {
                    continue;
                }

                const hostPort = this.extractHostPort(s.mongo_uri);
                const isCurrent = s.server_key === currentServer.server_key;

                servers.push({
                    server_key: s.server_key,
                    server_name: s.server_name,
                    id: s.server_key,
                    name: s.server_name,
                    ip: hostPort,
                    prefix: s.server_name.split(" ")[0],
                    status: "Active",
                    isLocal: isCurrent || s.server_key === "local",
                    isCurrent,
                    is_active: true,
                    description: s.description || s.server_name,
                });
            }

            return {
                statusCode: HttpStatus.OK,
                message: "Servers fetched successfully",
                data: servers,
                currentServer: {
                    server_key: currentServer.server_key,
                    server_name: currentServer.server_name,
                    id: currentServer.id,
                    name: currentServer.name,
                    ip: currentServer.ip,
                    description: currentServer.description,
                    isCurrent: true,
                    is_active: true,
                },
                supportedModules: SYNC_DEPENDENCY_ORDER.map((key) => ({
                    key,
                    label: MODULE_DISPLAY_NAMES[key],
                })),
            };
        } catch (error: any) {
            this.logger.error("Error fetching available servers", error);
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Failed to fetch servers",
                error: error.message,
            };
        }
    }

    /**
     * Validate the entire synchronization pipeline and live MongoDB connectivity
     */
    async validatePipeline(dto: ValidatePipelineDto): Promise<any> {
        const currentServer = await this.detectCurrentServer();
        const { source_server, target_server } = dto;

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate Source matches Current Logged-in Server
        const effectiveSourceKey = currentServer.server_key;
        const resolvedSource = await this.resolveMongoUri(source_server || effectiveSourceKey);
        const resolvedTarget = target_server ? await this.resolveMongoUri(target_server) : null;

        if (source_server && source_server !== currentServer.server_key && source_server !== currentServer.server_name) {
            warnings.push(
                `Specified source '${source_server}' does not match the current logged-in server '${currentServer.server_name}'. The system automatically enforces the current server as source.`
            );
        }

        // Validate Source !== Target
        if (!target_server) {
            errors.push("Destination (Target Server) must be selected.");
        } else if (resolvedTarget && (resolvedSource.uri === resolvedTarget.uri || (source_server && source_server === target_server))) {
            errors.push("Source Server and Destination (Target Server) cannot be identical. Please select another target server.");
        }

        // 1. Test Source MongoDB Connection
        let sourceStatus = "Disconnected";
        let sourceLatency = 0;
        try {
            const start = Date.now();
            const sourceConn = await this.getMongoConnection(effectiveSourceKey);
            await sourceConn.db.admin().ping();
            sourceLatency = Date.now() - start;
            sourceStatus = "Connected";
        } catch (err: any) {
            sourceStatus = "Error";
            errors.push(`Source MongoDB connection failed for ${currentServer.server_name}: ${err.message}`);
        }

        // 2. Test Target MongoDB Connection
        let targetStatus = "Disconnected";
        let targetLatency = 0;
        if (target_server && resolvedTarget && !errors.some((e) => e.includes("cannot be identical"))) {
            try {
                const start = Date.now();
                const targetConn = await this.getMongoConnection(target_server);
                await targetConn.db.admin().ping();
                targetLatency = Date.now() - start;
                targetStatus = "Connected";
            } catch (err: any) {
                targetStatus = "Error";
                errors.push(`Target MongoDB connection failed for ${resolvedTarget.name}: ${err.message}`);
            }
        }

        const isReady = errors.length === 0 && sourceStatus === "Connected" && targetStatus === "Connected";

        return {
            statusCode: HttpStatus.OK,
            message: isReady ? "Pipeline validation successful and ready" : "Pipeline validation incomplete",
            data: {
                currentServer: {
                    server_key: currentServer.server_key,
                    server_name: currentServer.server_name,
                    id: currentServer.id,
                    name: currentServer.name,
                    ip: currentServer.ip,
                    isCurrent: true,
                },
                sourceServer: {
                    server_key: currentServer.server_key,
                    server_name: currentServer.server_name,
                    id: currentServer.id,
                    name: currentServer.name,
                    status: sourceStatus,
                    latencyMs: sourceLatency,
                    uriSanitized: this.sanitizeUriForDisplay(resolvedSource.uri),
                },
                targetServer: resolvedTarget ? {
                    server_key: resolvedTarget.server_key,
                    server_name: resolvedTarget.name,
                    id: target_server,
                    name: resolvedTarget.name,
                    status: targetStatus,
                    latencyMs: targetLatency,
                    uriSanitized: this.sanitizeUriForDisplay(resolvedTarget.uri),
                } : null,
                isReady,
                syncStatus: isReady ? "READY" : "NOT_READY",
                errors,
                warnings,
            },
        };
    }

    /**
     * Preview changes before synchronization (Dry Run across direct MongoDB connections)
     */
    async previewSync(dto: PreviewSyncDto): Promise<any> {
        const currentServer = await this.detectCurrentServer();
        const { target_server, modules, tenant_uuid } = dto;
        const source_server = dto.source_server && dto.source_server.trim() !== "" ? dto.source_server.trim() : currentServer.server_key;
        const cleanTenantUuid =
            tenant_uuid && tenant_uuid !== "undefined" && tenant_uuid !== "null" && tenant_uuid !== "all" && tenant_uuid.trim() !== ""
                ? tenant_uuid.trim()
                : undefined;

        if (!target_server) {
            throw new Error("Target server must be specified for sync preview");
        }
        if (source_server === target_server) {
            throw new Error("Source server and target server cannot be identical");
        }

        const targetModules = this.resolveModuleList(modules);
        const previewResults: Record<string, any> = {};
        let totalSourceRecords = 0;

        for (const mod of targetModules) {
            const moduleData = await this.getModuleRecords(mod, source_server, target_server, cleanTenantUuid);
            totalSourceRecords += moduleData.total;

            previewResults[mod] = {
                moduleName: MODULE_DISPLAY_NAMES[mod],
                totalSource: moduleData.total,
                existingOnTarget: moduleData.existingOnTarget,
                newToCreate: moduleData.newToCreate,
                records: moduleData.records,
                sampleRecords: moduleData.records.slice(0, 5).map((r: any) => r.name || r.identifier),
            };
        }

        return {
            statusCode: HttpStatus.OK,
            message: "Sync preview generated successfully",
            data: {
                source_server,
                target_server,
                totalSourceRecords,
                modules: previewResults,
            },
        };
    }

    /**
     * Get detailed structured records for a specific module directly from Origin (Source Server) MongoDB
     */
    async getModuleRecords(
        module: SyncModuleType,
        sourceServer?: string,
        targetServer?: string,
        tenant_uuid?: string,
    ): Promise<any> {
        let sourceRecords: any[] = [];
        let targetConn: Connection | null = null;
        const currentServer = await this.detectCurrentServer();
        const effectiveSourceKey = sourceServer && sourceServer.trim() !== "" ? sourceServer.trim() : currentServer.server_key;

        try {
            const sourceConn = await this.getMongoConnection(effectiveSourceKey);
            sourceRecords = await this.fetchModuleDataFromConnection(sourceConn, module, tenant_uuid);
        } catch (err: any) {
            this.logger.error(`Direct Mongo read failed from Origin Server [${effectiveSourceKey}]: ${err.message}`);
            sourceRecords = [];
        }

        if (targetServer && targetServer.trim() !== "" && targetServer !== effectiveSourceKey) {
            try {
                targetConn = await this.getMongoConnection(targetServer);
            } catch (err: any) {
                this.logger.warn(`Could not connect to target server [${targetServer}] for preview: ${err.message}`);
                targetConn = null;
            }
        }

        let existingOnTarget = 0;

        const records = await Promise.all(
            sourceRecords.map(async (rec) => {
                let exists: any = null;
                if (targetConn) {
                    try {
                        exists = await this.findExistingRecordOnConn(targetConn, module, rec);
                    } catch {
                        exists = null;
                    }
                }

                if (exists) existingOnTarget++;

                return {
                    id: rec.uuid || rec.disposition_uuid || rec._id?.toString(),
                    name: this.getRecordIdentifier(module, rec),
                    identifier: this.getRecordSecondaryDetail(module, rec),
                    type: this.getRecordType(module, rec),
                    status: rec.status === "0" ? "Active" : rec.status === "1" ? "Inactive" : (rec.status || "Active"),
                    existsOnTarget: !!exists,
                    targetUuid: exists?.uuid || exists?.disposition_uuid || exists?._id?.toString() || null,
                    details: this.getRecordCustomDetails(module, rec),
                };
            }),
        );

        return {
            statusCode: HttpStatus.OK,
            message: "Module records fetched successfully",
            data: {
                module,
                moduleName: MODULE_DISPLAY_NAMES[module],
                total: records.length,
                existingOnTarget,
                newToCreate: records.length - existingOnTarget,
                records,
            },
            module,
            moduleName: MODULE_DISPLAY_NAMES[module],
            total: records.length,
            existingOnTarget,
            newToCreate: records.length - existingOnTarget,
            records,
        };
    }

    private getRecordType(module: SyncModuleType, record: any): string {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return "Tenant Role";
            case SyncModuleType.TENANT:
                return (record.roles && (record.roles.role_name || record.roles.name))
                    ? `Role: ${record.roles.role_name || record.roles.name}`
                    : (record.role || "Tenant Org");
            case SyncModuleType.USER_ROLE:
                return "User Role";
            case SyncModuleType.USER_GROUP:
                return record.role ? `Role: ${record.role}` : "Agent Group";
            case SyncModuleType.DID:
                return record.assign_tenant_uuid !== undefined ? "Admin DID" : "Tenant DID";
            case SyncModuleType.IP_MAPPING:
                return record.tenant_uuid ? "Tenant IP Mapping" : "Admin IP Mapping";
            case SyncModuleType.TRUNK:
                return record.register === "1" ? "Registered Trunk" : "IP Trunk";
            case SyncModuleType.OUTGOING_RULES:
                return "Dial Routing";
            case SyncModuleType.BREAK_CODE:
                return record.billable === "1" ? "Billable" : "Non-Billable";
            case SyncModuleType.DISPOSITION:
                return record.sale === "1"
                    ? "Sale / Won"
                    : record.callback === "1"
                        ? "Callback"
                        : record.human_answer === "1"
                            ? "Human Answer"
                            : "General";
            case SyncModuleType.CAMPAIGN:
                return record._campaign_type ? `${record._campaign_type}` : "Campaign";
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return "Lead Group";
            case SyncModuleType.USERS:
                return `User (${record.role || "Standard"})`;
            case SyncModuleType.SIP_DEVICES:
                return "SIP Extension";
            case SyncModuleType.USER_AND_SIP_DEVICES:
                return record._entity_type === "EXTENSION"
                    ? "SIP Extension"
                    : `User (${record.role || "Standard"})`;
            case SyncModuleType.VOICE_BROADCAST:
                return record.broadcast_type === "1" ? "Survey Broadcast" : record.broadcast_type === "2" ? "IVR Broadcast" : record.broadcast_type ? `Broadcast (${record.broadcast_type})` : "Voice Broadcast";
            default:
                return record._entity_type || record._campaign_type || record.role || "Standard";
        }
    }

    private getRecordSecondaryDetail(module: SyncModuleType, record: any): string {
        switch (module) {
            case SyncModuleType.TENANT_ROLE: {
                const modCount = record.module_permission ? Object.keys(record.module_permission).length : 0;
                const defCount = record.default_permission ? Object.keys(record.default_permission).length : 0;
                return `Permissions: ${modCount} module(s) | Defaults: ${defCount} rule(s)`;
            }
            case SyncModuleType.TENANT: {
                const code = record.company_code ? `Code: ${record.company_code}` : "";
                const domain = record.domain ? `Domain: ${record.domain}` : "";
                const email = record.email ? `Email: ${record.email}` : "";
                const username = record.username ? `Admin: ${record.username}` : "";
                return [code, domain, email, username].filter(Boolean).join(" | ") || `Tenant ID: ${record.uuid || "N/A"}`;
            }
            case SyncModuleType.USER_ROLE: {
                const pbx = record.pbx_mode === "1" ? "PBX: Yes" : "PBX: No";
                const cc = record.call_center_mode === "1" ? "CC: Yes" : "CC: No";
                const rec = record.recording === "1" ? "Rec: Yes" : "Rec: No";
                return `${pbx} | ${cc} | ${rec}`;
            }
            case SyncModuleType.USER_GROUP: {
                const outbound = record.outbound_rule ? `Outbound: ${record.outbound_rule}` : "Outbound: Default";
                const role = record.role ? `Role: ${record.role}` : "";
                return [role, outbound].filter(Boolean).join(" | ") || "User Group Config";
            }
            case SyncModuleType.DID: {
                const fwd = record.did_forwarding_type
                    ? `Fwd: ${record.did_forwarding_type}${record.did_forwarding_value ? ` (${record.did_forwarding_value})` : ""}`
                    : "Direct";
                const codec = record.codec ? `Codec: ${record.codec}` : "";
                return [fwd, codec].filter(Boolean).join(" | ");
            }
            case SyncModuleType.IP_MAPPING: {
                const ip = record.ip ? `IP: ${record.ip}` : "";
                const prefix = record.prefix ? `Prefix: ${record.prefix}` : "";
                return [ip, prefix].filter(Boolean).join(" | ") || "IP Mapping";
            }
            case SyncModuleType.TRUNK: {
                const domain = record.domain ? `Domain: ${record.domain}` : "";
                const proxy = record.outbound_proxy ? `Proxy: ${record.outbound_proxy}` : "";
                const user = record.username ? `User: ${record.username}` : "";
                return [domain, proxy, user].filter(Boolean).join(" | ") || "SIP Trunk Gateway";
            }
            case SyncModuleType.OUTGOING_RULES: {
                const rulesCount = Array.isArray(record.rules) ? record.rules.length : 0;
                const desc = record.description ? `Desc: ${record.description}` : "";
                return [`Patterns: ${rulesCount} rule(s)`, desc].filter(Boolean).join(" | ");
            }
            case SyncModuleType.BREAK_CODE: {
                const code = record.break_code ? `Code: ${record.break_code}` : "";
                const dur = record.duration ? `Duration: ${record.duration}s` : "Duration: Unlimited";
                const bill = record.billable === "1" ? "Billable" : "Non-billable";
                return [code, dur, bill].filter(Boolean).join(" | ");
            }
            case SyncModuleType.DISPOSITION: {
                const code = record.code ? `Code: ${record.code}` : "";
                const level = record.level !== undefined ? `Level: ${record.level}` : "";
                const human = record.human_answer === "1" ? "Human Ans" : "";
                return [code, level, human].filter(Boolean).join(" | ") || "Call Disposition";
            }
            case SyncModuleType.CAMPAIGN: {
                const method = record.dial_method ? `Dial: ${record.dial_method}` : "";
                const cid = record.caller_id || record.caller_id_number ? `CID: ${record.caller_id || record.caller_id_number}` : "";
                const retries = record.max_retries || record.call_retries ? `Retries: ${record.max_retries || record.call_retries}` : "";
                return [method, cid, retries].filter(Boolean).join(" | ") || "Campaign Config";
            }
            case SyncModuleType.CAMPAIGN_LEAD_GROUP: {
                const leads = `Leads: ${record.totalLeadCount ?? 0}`;
                const human = `Human Ans: ${record.human_answer ?? 0}`;
                const sale = `Sales: ${record.sale ?? 0}`;
                return `${leads} | ${human} | ${sale}`;
            }
            case SyncModuleType.USERS: {
                const email = record.email ? `Email: ${record.email}` : "";
                const username = record.username ? `User: ${record.username}` : "";
                const role = record.role ? `Role: ${record.role}` : "";
                return [email, username, role].filter(Boolean).join(" | ") || "System User";
            }
            case SyncModuleType.SIP_DEVICES: {
                const ext = record.extension ? `Ext: ${record.extension}` : "";
                const cid = record.caller_id_number ? `CID: ${record.caller_id_number}` : "";
                const device = record.device_name ? `Device: ${record.device_name}` : "";
                return [ext, cid, device].filter(Boolean).join(" | ") || "SIP Extension";
            }
            case SyncModuleType.USER_AND_SIP_DEVICES: {
                if (record._entity_type === "EXTENSION") {
                    const ext = record.extension ? `Ext: ${record.extension}` : "";
                    const cid = record.caller_id_number ? `CID: ${record.caller_id_number}` : "";
                    const device = record.device_name ? `Device: ${record.device_name}` : "";
                    return [ext, cid, device].filter(Boolean).join(" | ") || "SIP Extension";
                }
                const email = record.email ? `Email: ${record.email}` : "";
                const username = record.username ? `User: ${record.username}` : "";
                const role = record.role ? `Role: ${record.role}` : "";
                return [email, username, role].filter(Boolean).join(" | ") || "System User";
            }
            case SyncModuleType.VOICE_BROADCAST: {
                const bType = record.broadcast_type === "1" ? "Type: Survey" : record.broadcast_type === "2" ? "Type: IVR" : record.broadcast_type ? `Type: ${record.broadcast_type}` : "";
                const cid = record.caller_id ? `CID: ${record.caller_id}` : "";
                const channel = record.channel !== undefined ? `Channels: ${record.channel}` : "";
                const retries = record.max_retries ? `Retries: ${record.max_retries}` : "";
                return [bType, cid, channel, retries].filter(Boolean).join(" | ") || "Voice Broadcast";
            }
            default:
                return record.description || record.uuid || "";
        }
    }

    private getRecordCustomDetails(module: SyncModuleType, record: any): Record<string, any> {
        const sanitized = { ...record };
        delete sanitized.password;
        delete sanitized._id;
        delete sanitized.__v;
        return sanitized;
    }

    /**
     * Execute full server synchronization across direct MongoDB connections
     */
    async executeSync(dto: ExecuteSyncDto, userMetadata?: any): Promise<any> {
        const currentServer = await this.detectCurrentServer();
        const { target_server, modules, duplicate_strategy = DuplicateStrategy.SKIP, tenant_uuid } = dto;
        const source_server = dto.source_server && dto.source_server.trim() !== "" ? dto.source_server.trim() : currentServer.server_key;
        const cleanTenantUuid =
            tenant_uuid && tenant_uuid !== "undefined" && tenant_uuid !== "null" && tenant_uuid !== "all" && tenant_uuid.trim() !== ""
                ? tenant_uuid.trim()
                : undefined;

        if (!target_server) {
            throw new Error("Target destination server must be specified");
        }

        const sourceServerInfo = await this.resolveMongoUri(source_server);
        const targetServerInfo = await this.resolveMongoUri(target_server);

        if (sourceServerInfo.server_key === targetServerInfo.server_key || sourceServerInfo.uri === targetServerInfo.uri) {
            throw new Error("Source server and target destination server cannot be identical or point to the same database instance");
        }

        const sync_id = `SYNC-${Date.now()}-${randomUUID().slice(0, 8)}`;
        const targetModules = this.resolveModuleList(modules);

        // Initialize history record in local database
        const historyRecord = new this.syncHistoryModel({
            sync_id,
            source_server: sourceServerInfo.name,
            target_server: targetServerInfo.name,
            selected_modules: targetModules,
            duplicate_strategy,
            status: "IN_PROGRESS",
            triggered_by: userMetadata?.username || userMetadata?.email || "Super Admin",
            tenant_uuid: tenant_uuid || "",
            started_at: new Date(),
            summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
            module_stats: {},
            logs: [],
        });

        await historyRecord.save();

        const idMap: Record<string, string> = {}; // source_uuid -> target_uuid
        const moduleStats: Record<string, any> = {};
        const logs: Array<{ timestamp: Date; module?: string; level: string; message: string }> = [];

        const appendLog = (message: string, module?: string, level: string = "INFO") => {
            const entry = { timestamp: new Date(), module, level, message };
            logs.push(entry);
            this.logger.log(`[${sync_id}] [${module || "GENERAL"}] ${message}`);
        };

        appendLog(`Synchronization initialized. Source: [${sourceServerInfo.name}] (${this.sanitizeUriForDisplay(sourceServerInfo.uri)}) -> Target: [${targetServerInfo.name}] (${this.sanitizeUriForDisplay(targetServerInfo.uri)}). Strategy: ${duplicate_strategy}`);
        const strategyDescriptions: Record<string, string> = {
            [DuplicateStrategy.SKIP]: "existing target records are left unchanged (SKIPPED); missing records are created with new UUIDs and remapped foreign keys",
            [DuplicateStrategy.UPDATE]: "existing target records are merged with source fields (UPDATED/MERGED) keeping the target UUID; missing records are created",
            [DuplicateStrategy.OVERWRITE]: "existing target records are fully replaced by the source copy incl. source UUIDs (OVERWRITTEN); missing records are created with source UUIDs",
        };
        appendLog(`Conflict resolution strategy [${duplicate_strategy}]: ${strategyDescriptions[duplicate_strategy] || "unknown"}`);

        const grandSummary = { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 };

        try {
            // 1. Establish & Validate Source and Target MongoDB Connections
            appendLog(`Validating Source MongoDB connection for [${sourceServerInfo.name}]...`);
            const sourceConn = await this.getMongoConnection(source_server);
            await sourceConn.db.admin().ping();
            appendLog(`Source MongoDB connection verified successfully [DB: ${sourceConn.name}].`);

            appendLog(`Validating Target MongoDB connection for target server [${targetServerInfo.name}]...`);
            const targetConn = await this.getMongoConnection(target_server);
            await targetConn.db.admin().ping();
            appendLog(`Target MongoDB connection verified successfully [DB: ${targetConn.name}].`);

            // 2. Synchronize modules in dependency order
            for (const mod of targetModules) {
                appendLog(`Starting synchronization for module: ${MODULE_DISPLAY_NAMES[mod]}`, mod, "INFO");

                const modStat = {
                    moduleName: MODULE_DISPLAY_NAMES[mod],
                    total: 0,
                    created: 0,
                    updated: 0,
                    skipped: 0,
                    failed: 0,
                    status: "COMPLETED",
                    errors: [] as Array<{ recordId?: string; recordName?: string; reason: string }>,
                };

                // Fetch source records directly from source MongoDB
                const sourceData = await this.fetchModuleDataFromConnection(sourceConn, mod, cleanTenantUuid);
                modStat.total = sourceData.length;
                grandSummary.total += sourceData.length;

                if (sourceData.length === 0) {
                    appendLog(`No records found to synchronize for ${MODULE_DISPLAY_NAMES[mod]}`, mod, "INFO");
                    modStat.status = "COMPLETED";
                    moduleStats[mod] = modStat;
                    continue;
                }

                appendLog(`Fetched ${sourceData.length} records for ${MODULE_DISPLAY_NAMES[mod]}. Processing...`, mod, "INFO");

                // Process records sequentially on target MongoDB
                for (const rawRecord of sourceData) {
                    try {
                        const result = await this.syncSingleRecordOnConn(sourceConn, targetConn, mod, rawRecord, idMap, duplicate_strategy);
                        const d = result.details;

                        // Detailed multi-line debug logging as specifically requested
                        this.logger.log(
                            `[SYNC TARGET WRITE]\n` +
                            `  Source DB: ${d.sourceDb}\n` +
                            `  Source Collection: ${d.sourceCollection}\n` +
                            `  Target DB: ${d.targetDb}\n` +
                            `  Target Collection: ${d.targetCollection}\n` +
                            `  Record Identifier: ${d.recordIdentifier}\n` +
                            `  MongoDB Filter: ${JSON.stringify(d.filter)}\n` +
                            `  Write Operation: ${d.operation}\n` +
                            `  matchedCount: ${d.matchedCount}\n` +
                            `  modifiedCount: ${d.modifiedCount}\n` +
                            `  upsertedCount: ${d.upsertedCount}\n` +
                            `  acknowledged: ${d.acknowledged}`
                        );

                        appendLog(
                            `[${duplicate_strategy}] [${result.action === "UPDATED" ? "UPDATED/MERGED" : result.action}] "${d.recordIdentifier}" | Target: ${d.targetDb}.${d.targetCollection} | Op: ${d.operation} | Filter: ${JSON.stringify(d.filter)} | matched: ${d.matchedCount}, modified: ${d.modifiedCount}, ack: ${d.acknowledged}`,
                            mod,
                            "INFO"
                        );

                        if (result.action === "CREATED") {
                            modStat.created++;
                            grandSummary.created++;
                        } else if (result.action === "UPDATED" || result.action === "OVERWRITTEN") {
                            // OVERWRITTEN is counted under "updated" to keep the summary/history contract unchanged
                            modStat.updated++;
                            grandSummary.updated++;
                        } else if (result.action === "SKIPPED") {
                            modStat.skipped++;
                            grandSummary.skipped++;
                        }
                    } catch (recError: any) {
                        modStat.failed++;
                        grandSummary.failed++;
                        const recordName = this.getRecordIdentifier(mod, rawRecord);
                        const errReason = recError.message || "Unknown error";
                        modStat.errors.push({ recordId: rawRecord.uuid || rawRecord._id, recordName, reason: errReason });
                        this.logger.error(`[SYNC WRITE ERROR] Failed to sync ${recordName}: ${errReason}`, recError.stack);
                        appendLog(`Failed to sync ${recordName}: ${errReason}`, mod, "ERROR");
                    }
                }

                if (modStat.failed > 0 && modStat.created === 0 && modStat.updated === 0 && modStat.skipped === 0) {
                    modStat.status = "FAILED";
                } else if (modStat.failed > 0) {
                    modStat.status = "PARTIAL_SUCCESS";
                } else {
                    modStat.status = "COMPLETED";
                }

                moduleStats[mod] = modStat;
                appendLog(
                    `Finished ${MODULE_DISPLAY_NAMES[mod]}: Total=${modStat.total}, Created=${modStat.created}, Updated=${modStat.updated}, Skipped=${modStat.skipped}, Failed=${modStat.failed}`,
                    mod,
                    modStat.failed > 0 ? "WARN" : "SUCCESS",
                );
            }

            const overallStatus = grandSummary.failed === 0 ? "COMPLETED" : grandSummary.created > 0 || grandSummary.updated > 0 ? "PARTIAL_SUCCESS" : "FAILED";

            appendLog(`Synchronization ${overallStatus}. Final counts: Created=${grandSummary.created}, Updated=${grandSummary.updated}, Skipped=${grandSummary.skipped}, Failed=${grandSummary.failed}`, undefined, "SUCCESS");

            // Update database history
            await this.syncHistoryModel.findOneAndUpdate(
                { sync_id },
                {
                    $set: {
                        status: overallStatus,
                        summary: grandSummary,
                        module_stats: moduleStats,
                        logs,
                        completed_at: new Date(),
                    },
                },
            );

            return {
                statusCode: HttpStatus.OK,
                message: `Server data synchronization ${overallStatus.toLowerCase()}`,
                data: {
                    sync_id,
                    status: overallStatus,
                    summary: grandSummary,
                    module_stats: moduleStats,
                    logs,
                },
            };
        } catch (globalError: any) {
            this.logger.error(`Critical error during sync [${sync_id}]`, globalError);
            appendLog(`Critical synchronization failure: ${globalError.message}`, undefined, "ERROR");

            await this.syncHistoryModel.findOneAndUpdate(
                { sync_id },
                {
                    $set: {
                        status: "FAILED",
                        summary: grandSummary,
                        module_stats: moduleStats,
                        logs,
                        completed_at: new Date(),
                    },
                },
            );

            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Sync execution encountered a critical error",
                error: globalError.message,
                data: {
                    sync_id,
                    status: "FAILED",
                    summary: grandSummary,
                    module_stats: moduleStats,
                    logs,
                },
            };
        }
    }

    /**
     * Synchronize a single record on target MongoDB Connection with full write verification and logging
     */
    private async syncSingleRecordOnConn(
        sourceConn: Connection,
        targetConn: Connection,
        module: SyncModuleType,
        rawRecord: any,
        idMap: Record<string, string>,
        strategy: DuplicateStrategy,
    ): Promise<{
        action: "CREATED" | "UPDATED" | "OVERWRITTEN" | "SKIPPED";
        targetUuid: string;
        details: {
            sourceDb: string;
            sourceCollection: string;
            targetDb: string;
            targetCollection: string;
            recordIdentifier: string;
            filter: any;
            operation: string;
            matchedCount: number;
            modifiedCount: number;
            upsertedCount: number;
            acknowledged: boolean;
        };
    }> {
        const sourceUuid = rawRecord.uuid || rawRecord.disposition_uuid || rawRecord._id?.toString();
        // Tenant-scoped lookups must use the target tenant's UUID (source tenant UUID may differ on target)
        const lookupRecord =
            rawRecord.tenant_uuid && idMap[rawRecord.tenant_uuid]
                ? { ...rawRecord, tenant_uuid: idMap[rawRecord.tenant_uuid] }
                : rawRecord;
        let existingRecord = await this.findExistingRecordOnConn(targetConn, module, lookupRecord);
        // OVERWRITE may have re-keyed the parent tenant in this run; target children still reference its previous UUID
        const previousTenantUuid = this.overwrittenUuidAliases.get(idMap)?.[lookupRecord.tenant_uuid];
        if (!existingRecord && previousTenantUuid) {
            existingRecord = await this.findExistingRecordOnConn(targetConn, module, { ...lookupRecord, tenant_uuid: previousTenantUuid });
        }
        const recordIdentifier = this.getRecordIdentifier(module, rawRecord);
        const sourceModels = this.getModuleModels(sourceConn);
        const targetModels = this.getModuleModels(targetConn);
        const sourceDb = sourceConn.name || "source_db";
        const targetDb = targetConn.name || "target_db";

        if (existingRecord) {
            const existingUuid = existingRecord.uuid || existingRecord.disposition_uuid || existingRecord._id?.toString();

            if (strategy === DuplicateStrategy.OVERWRITE) {
                // Full replacement: target becomes an exact copy of the source (incl. source UUIDs)
                const overwritePayload = this.prepareOverwritePayload(module, rawRecord, idMap);
                const writeResult = await this.overwriteTargetRecordOnConn(targetConn, module, existingRecord, overwritePayload, rawRecord);
                if (sourceUuid) idMap[sourceUuid] = writeResult.targetUuid || existingUuid;
                if (writeResult.targetUuid && existingUuid && writeResult.targetUuid !== existingUuid) {
                    const aliases = this.overwrittenUuidAliases.get(idMap) || {};
                    aliases[writeResult.targetUuid] = existingUuid;
                    this.overwrittenUuidAliases.set(idMap, aliases);
                }

                this.logger.debug(`[SYNC STRATEGY] OVERWRITE -> OVERWRITTEN "${recordIdentifier}" (target uuid ${existingUuid} -> ${writeResult.targetUuid || existingUuid})`);

                return {
                    action: "OVERWRITTEN",
                    targetUuid: writeResult.targetUuid || existingUuid,
                    details: {
                        sourceDb,
                        sourceCollection: this.resolveCollectionName(sourceModels, module, rawRecord),
                        targetDb,
                        targetCollection: writeResult.collection,
                        recordIdentifier,
                        filter: writeResult.filter,
                        operation: writeResult.operation,
                        matchedCount: writeResult.matchedCount,
                        modifiedCount: writeResult.modifiedCount,
                        upsertedCount: writeResult.upsertedCount,
                        acknowledged: writeResult.acknowledged,
                    },
                };
            }

            // SKIP & UPDATE keep the existing target UUID; children are remapped to it
            if (sourceUuid) idMap[sourceUuid] = existingUuid;

            if (strategy === DuplicateStrategy.SKIP) {
                this.logger.debug(`[SYNC STRATEGY] SKIP -> SKIPPED "${recordIdentifier}" (existing target uuid ${existingUuid} left unchanged)`);
                return {
                    action: "SKIPPED",
                    targetUuid: existingUuid,
                    details: {
                        sourceDb,
                        sourceCollection: this.resolveCollectionName(sourceModels, module, rawRecord),
                        targetDb,
                        targetCollection: this.resolveCollectionName(targetModels, module, rawRecord),
                        recordIdentifier,
                        filter: existingRecord._id ? { _id: existingRecord._id } : { uuid: existingUuid },
                        operation: "SKIP",
                        matchedCount: 1,
                        modifiedCount: 0,
                        upsertedCount: 0,
                        acknowledged: true,
                    },
                };
            }

            // UPDATE (merge)
            const updatedPayload = this.prepareRecordPayload(module, rawRecord, idMap, false);
            // Preserve the target record's identifiers; never replace them with source UUIDs
            delete updatedPayload.uuid;
            delete updatedPayload.disposition_uuid;
            if (existingRecord.uuid && !updatedPayload.uuid) {
                updatedPayload.uuid = existingRecord.uuid;
            }
            if (existingRecord.disposition_uuid) {
                updatedPayload.disposition_uuid = existingRecord.disposition_uuid;
            }

            // Deep-merge nested objects so target-only nested keys are not wiped out
            const mergePayload = this.buildMergeSet(updatedPayload, existingRecord);
            const writeResult = await this.updateTargetRecordOnConn(targetConn, module, existingRecord, mergePayload, rawRecord);

            this.logger.debug(`[SYNC STRATEGY] UPDATE -> UPDATED/MERGED "${recordIdentifier}" (target uuid ${existingUuid} preserved)`);

            return {
                action: "UPDATED",
                targetUuid: existingUuid,
                details: {
                    sourceDb,
                    sourceCollection: this.resolveCollectionName(sourceModels, module, rawRecord),
                    targetDb,
                    targetCollection: writeResult.collection,
                    recordIdentifier,
                    filter: writeResult.filter,
                    operation: writeResult.operation,
                    matchedCount: writeResult.matchedCount,
                    modifiedCount: writeResult.modifiedCount,
                    upsertedCount: writeResult.upsertedCount,
                    acknowledged: writeResult.acknowledged,
                },
            };
        }

        // CREATE NEW RECORD
        if (strategy === DuplicateStrategy.OVERWRITE && sourceUuid) {
            // OVERWRITE mirrors the source exactly, so new records keep the source _id/UUIDs
            const exactPayload = this.prepareOverwritePayload(module, rawRecord, idMap);
            // Keep the source _id only when it is a real ObjectId (JSON imports deliver it as a string)
            if (rawRecord._id instanceof Types.ObjectId) exactPayload._id = rawRecord._id;
            const targetModel = this.resolveModuleModel(targetModels, module, rawRecord);
            const conflictField = await this.findIdentifierConflict(targetModel, exactPayload);

            if (!conflictField) {
                const insertResult = await targetModel.collection.insertOne(exactPayload);
                if (!insertResult || !insertResult.acknowledged) {
                    throw new Error(`MongoDB write not acknowledged by target database for ${module}`);
                }
                idMap[sourceUuid] = sourceUuid;
                this.logger.debug(`[SYNC STRATEGY] OVERWRITE -> CREATED "${recordIdentifier}" with source uuid ${sourceUuid}`);

                return {
                    action: "CREATED",
                    targetUuid: sourceUuid,
                    details: {
                        sourceDb,
                        sourceCollection: this.resolveCollectionName(sourceModels, module, rawRecord),
                        targetDb,
                        targetCollection: targetModel.collection.name,
                        recordIdentifier,
                        filter: { _id: insertResult.insertedId },
                        operation: "insertOne (exact source copy)",
                        matchedCount: 0,
                        modifiedCount: 0,
                        upsertedCount: 1,
                        acknowledged: true,
                    },
                };
            }
            this.logger.warn(`[SYNC STRATEGY] OVERWRITE -> "${recordIdentifier}": source ${conflictField} already used by another target record; creating with a new UUID instead`);
        }

        const newTargetUuid = randomUUID();
        const newPayload = this.prepareRecordPayload(module, rawRecord, idMap, true, newTargetUuid);
        const writeResult = await this.createTargetRecordOnConn(targetConn, module, newPayload, rawRecord);

        if (sourceUuid) {
            idMap[sourceUuid] = newTargetUuid;
        }
        this.logger.debug(`[SYNC STRATEGY] ${strategy} -> CREATED "${recordIdentifier}" with new target uuid ${newTargetUuid}`);

        return {
            action: "CREATED",
            targetUuid: newTargetUuid,
            details: {
                sourceDb,
                sourceCollection: this.resolveCollectionName(sourceModels, module, rawRecord),
                targetDb,
                targetCollection: writeResult.collection,
                recordIdentifier,
                filter: writeResult.filter,
                operation: writeResult.operation,
                matchedCount: writeResult.matchedCount,
                modifiedCount: writeResult.modifiedCount,
                upsertedCount: writeResult.upsertedCount,
                acknowledged: writeResult.acknowledged,
            },
        };
    }

    /**
     * Inter-server export endpoint logic
     */
    async exportData(dto: ExportDataDto): Promise<any> {
        const { module, tenant_uuid } = dto;
        const records = await this.fetchLocalModuleData(module as SyncModuleType, tenant_uuid);
        return {
            statusCode: HttpStatus.OK,
            message: `Exported ${records.length} records for ${module}`,
            data: records,
        };
    }

    /**
     * Inter-server import endpoint logic
     */
    async importData(dto: ImportDataDto): Promise<any> {
        const { module, records, id_map = {}, duplicate_strategy = DuplicateStrategy.SKIP } = dto;
        const modType = module as SyncModuleType;
        const modStat = { total: records.length, created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

        for (const rec of records) {
            try {
                const res = await this.syncSingleRecord(modType, rec, id_map, duplicate_strategy);
                if (res.action === "CREATED") modStat.created++;
                else if (res.action === "UPDATED" || res.action === "OVERWRITTEN") modStat.updated++;
                else if (res.action === "SKIPPED") modStat.skipped++;
            } catch (err: any) {
                modStat.failed++;
                modStat.errors.push({ recordName: this.getRecordIdentifier(modType, rec), reason: err.message });
            }
        }

        return {
            statusCode: HttpStatus.OK,
            message: `Import completed for ${module}`,
            data: modStat,
            id_map,
        };
    }

    /**
     * Fetch sync history with pagination
     */
    async getHistory(queryParams: any): Promise<any> {
        const page = parseInt(queryParams?.page, 10) || 1;
        const limit = parseInt(queryParams?.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const [total, data] = await Promise.all([
            this.syncHistoryModel.countDocuments().exec(),
            this.syncHistoryModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
        ]);

        return {
            statusCode: HttpStatus.OK,
            message: "Sync history fetched successfully",
            data: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                history: data,
            },
        };
    }

    /**
     * Fetch single sync history by sync_id or uuid
     */
    async getHistoryById(id: string): Promise<any> {
        const record = await this.syncHistoryModel.findOne({ $or: [{ sync_id: id }, { uuid: id }] }).lean().exec();
        if (!record) {
            return {
                statusCode: HttpStatus.NOT_FOUND,
                message: "Sync history not found",
            };
        }
        return {
            statusCode: HttpStatus.OK,
            message: "Sync detail fetched successfully",
            data: record,
        };
    }

    // =========================================================================
    // PRIVATE / INTERNAL HELPER METHODS
    // =========================================================================

    private resolveModuleList(requestedModules: string[]): SyncModuleType[] {
        if (!requestedModules || requestedModules.length === 0 || requestedModules.includes("ALL")) {
            return SYNC_DEPENDENCY_ORDER;
        }

        return SYNC_DEPENDENCY_ORDER.filter((mod) => requestedModules.includes(mod));
    }

    private async fetchSourceData(module: SyncModuleType, sourceServer: string, tenant_uuid?: string): Promise<any[]> {
        try {
            const sourceConn = await this.getMongoConnection(sourceServer);
            return await this.fetchModuleDataFromConnection(sourceConn, module, tenant_uuid);
        } catch (error: any) {
            this.logger.error(`Could not fetch from source connection [${sourceServer}]: ${error.message}`);
            return [];
        }
    }

    async fetchModuleDataFromConnection(
        conn: Connection,
        module: SyncModuleType,
        tenant_uuid?: string,
    ): Promise<any[]> {
        const models = this.getModuleModels(conn);
        const cleanTenantUuid =
            tenant_uuid &&
                tenant_uuid !== "undefined" &&
                tenant_uuid !== "null" &&
                tenant_uuid !== "all" &&
                tenant_uuid.trim() !== ""
                ? tenant_uuid.trim()
                : undefined;

        const filter: any = {};
        if (cleanTenantUuid && !["TENANT_ROLE", "TENANT"].includes(module)) {
            filter.tenant_uuid = cleanTenantUuid;
        }

        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return models.roles.find().lean().exec();
            case SyncModuleType.TENANT:
                return models.tenant
                    .find(cleanTenantUuid ? { uuid: cleanTenantUuid } : {})
                    .lean()
                    .exec();
            case SyncModuleType.USER_ROLE:
                return models.userRole.find(filter).lean().exec();
            case SyncModuleType.USER_GROUP:
                return models.userGroup.find(filter).lean().exec();
            case SyncModuleType.DID: {
                const [dids, adminDids] = await Promise.all([
                    models.did.find(filter).lean().exec(),
                    models.adminDid.find().lean().exec(),
                ]);
                return [...adminDids, ...dids];
            }
            case SyncModuleType.IP_MAPPING: {
                const [tenantIps, adminIps] = await Promise.all([
                    models.ipMapping.find(filter).lean().exec(),
                    models.adminIpMapping.find().lean().exec(),
                ]);
                return [...adminIps, ...tenantIps];
            }
            case SyncModuleType.TRUNK:
                return models.trunk.find().lean().exec();
            case SyncModuleType.OUTGOING_RULES:
                return models.outgoingRules.find(filter).lean().exec();
            case SyncModuleType.BREAK_CODE:
                return models.breakcode.find(filter).lean().exec();
            case SyncModuleType.DISPOSITION:
                return models.disposition.find(filter).lean().exec();
            case SyncModuleType.CAMPAIGN: {
                const [outbound, inbound, blended] = await Promise.all([
                    models.outboundCampaign.find(filter).lean().exec(),
                    models.inboundCampaign.find(filter).lean().exec(),
                    models.blendedCampaign.find(filter).lean().exec(),
                ]);
                return [
                    ...outbound.map((c) => ({ ...c, _campaign_type: "OUTBOUND" })),
                    ...inbound.map((c) => ({ ...c, _campaign_type: "INBOUND" })),
                    ...blended.map((c) => ({ ...c, _campaign_type: "BLENDED" })),
                ];
            }
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return models.leadGroup.find(filter).lean().exec();
            case SyncModuleType.USERS:
                return models.user.find(filter).lean().exec();
            case SyncModuleType.SIP_DEVICES:
                return models.extension.find(filter).lean().exec();
            case SyncModuleType.USER_AND_SIP_DEVICES: {
                const [users, extensions] = await Promise.all([
                    models.user.find(filter).lean().exec(),
                    models.extension.find(filter).lean().exec(),
                ]);
                return [
                    ...users.map((u) => ({ ...u, _entity_type: "USER" })),
                    ...extensions.map((e) => ({ ...e, _entity_type: "EXTENSION" })),
                ];
            }
            case SyncModuleType.VOICE_BROADCAST:
                return models.voiceBroadcast.find(filter).lean().exec();
            default:
                return [];
        }
    }

    private async fetchLocalModuleData(module: SyncModuleType, tenant_uuid?: string): Promise<any[]> {
        const cleanTenantUuid =
            tenant_uuid &&
                tenant_uuid !== "undefined" &&
                tenant_uuid !== "null" &&
                tenant_uuid !== "all" &&
                tenant_uuid.trim() !== ""
                ? tenant_uuid.trim()
                : undefined;

        const filter: any = {};
        if (cleanTenantUuid && !["TENANT_ROLE", "TENANT"].includes(module)) {
            filter.tenant_uuid = cleanTenantUuid;
        }

        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return this.rolesModel.find().lean().exec();
            case SyncModuleType.TENANT:
                return this.tenantModel
                    .find(cleanTenantUuid ? { uuid: cleanTenantUuid } : {})
                    .lean()
                    .exec();
            case SyncModuleType.USER_ROLE:
                return this.userRoleModel.find(filter).lean().exec();
            case SyncModuleType.USER_GROUP:
                return this.userGroupModel.find(filter).lean().exec();
            case SyncModuleType.DID: {
                const [dids, adminDids] = await Promise.all([
                    this.didModel.find(filter).lean().exec(),
                    this.adminDidModel.find().lean().exec(),
                ]);
                return [...adminDids, ...dids];
            }
            case SyncModuleType.IP_MAPPING: {
                const [tenantIps, adminIps] = await Promise.all([
                    this.ipMappingModel.find(filter).lean().exec(),
                    this.adminIpMappingModel.find().lean().exec(),
                ]);
                return [...adminIps, ...tenantIps];
            }
            case SyncModuleType.TRUNK:
                return this.trunkModel.find().lean().exec();
            case SyncModuleType.OUTGOING_RULES:
                return this.outgoingRulesModel.find(filter).lean().exec();
            case SyncModuleType.BREAK_CODE:
                return this.breakcodeModel.find(filter).lean().exec();
            case SyncModuleType.DISPOSITION:
                return this.dispositionModel.find(filter).lean().exec();
            case SyncModuleType.CAMPAIGN: {
                const [outbound, inbound, blended] = await Promise.all([
                    this.outboundCampaignModel.find(filter).lean().exec(),
                    this.inboundCampaignModel.find(filter).lean().exec(),
                    this.blendedCampaignModel.find(filter).lean().exec(),
                ]);
                return [
                    ...outbound.map((c) => ({ ...c, _campaign_type: "OUTBOUND" })),
                    ...inbound.map((c) => ({ ...c, _campaign_type: "INBOUND" })),
                    ...blended.map((c) => ({ ...c, _campaign_type: "BLENDED" })),
                ];
            }
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return this.leadGroupModel.find(filter).lean().exec();
            case SyncModuleType.USERS:
                return this.userModel.find(filter).lean().exec();
            case SyncModuleType.SIP_DEVICES:
                return this.extensionModel.find(filter).lean().exec();
            case SyncModuleType.USER_AND_SIP_DEVICES: {
                const [users, extensions] = await Promise.all([
                    this.userModel.find(filter).lean().exec(),
                    this.extensionModel.find(filter).lean().exec(),
                ]);
                return [
                    ...users.map((u) => ({ ...u, _entity_type: "USER" })),
                    ...extensions.map((e) => ({ ...e, _entity_type: "EXTENSION" })),
                ];
            }
            case SyncModuleType.VOICE_BROADCAST:
                return this.voiceBroadcastModel.find(filter).lean().exec();
            default:
                return [];
        }
    }

    private async syncSingleRecord(
        module: SyncModuleType,
        rawRecord: any,
        idMap: Record<string, string>,
        strategy: DuplicateStrategy,
    ): Promise<{ action: "CREATED" | "UPDATED" | "OVERWRITTEN" | "SKIPPED"; targetUuid: string }> {
        // Delegate to the connection-based implementation on the local (default) connection so the
        // import endpoint applies exactly the same SKIP / UPDATE / OVERWRITE semantics as executeSync.
        const localConn = this.tenantModel.db;
        const res = await this.syncSingleRecordOnConn(localConn, localConn, module, rawRecord, idMap, strategy);
        return { action: res.action, targetUuid: res.targetUuid };
    }

    async findExistingRecordOnConn(conn: Connection, module: SyncModuleType, record: any): Promise<any> {
        const models = this.getModuleModels(conn);
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return models.roles.findOne({ role_name: record.role_name || record.name }).lean().exec();
            case SyncModuleType.TENANT: {
                const orConditions = [
                    ...(record.company_code ? [{ company_code: record.company_code }] : []),
                    ...(record.tenant_name ? [{ tenant_name: record.tenant_name }] : []),
                    ...(record.domain ? [{ domain: record.domain }] : []),
                ];
                if (orConditions.length === 0) return null;
                return models.tenant.findOne({ $or: orConditions }).lean().exec();
            }
            case SyncModuleType.USER_ROLE:
                return models.userRole.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.USER_GROUP:
                return models.userGroup.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.DID:
                if (record.assign_tenant_uuid !== undefined) {
                    return models.adminDid.findOne({ number: record.number }).lean().exec();
                }
                return models.did.findOne({ number: record.number }).lean().exec();
            case SyncModuleType.IP_MAPPING:
                if (record.tenant_uuid) {
                    return models.ipMapping.findOne({ ip: record.ip, tenant_uuid: record.tenant_uuid }).lean().exec();
                }
                return models.adminIpMapping.findOne({ ip: record.ip }).lean().exec();
            case SyncModuleType.TRUNK:
                return models.trunk.findOne({ name: record.name }).lean().exec();
            case SyncModuleType.OUTGOING_RULES:
                return models.outgoingRules.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.BREAK_CODE:
                return models.breakcode.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.DISPOSITION:
                return models.disposition.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.CAMPAIGN:
                if (record._campaign_type === "INBOUND") {
                    return models.inboundCampaign.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
                } else if (record._campaign_type === "BLENDED") {
                    return models.blendedCampaign.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
                }
                return models.outboundCampaign.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return models.leadGroup.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.USERS: {
                const userOrConditions = [
                    ...(record.username ? [{ username: record.username }] : []),
                    ...(record.email ? [{ email: record.email }] : []),
                ];
                if (userOrConditions.length === 0) return null;
                return models.user.findOne({ $or: userOrConditions }).lean().exec();
            }
            case SyncModuleType.SIP_DEVICES:
                return models.extension.findOne({ extension: record.extension, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.USER_AND_SIP_DEVICES: {
                if (record._entity_type === "EXTENSION") {
                    return models.extension.findOne({ extension: record.extension, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
                }
                const userOrConditions = [
                    ...(record.username ? [{ username: record.username }] : []),
                    ...(record.email ? [{ email: record.email }] : []),
                ];
                if (userOrConditions.length === 0) return null;
                return models.user.findOne({ $or: userOrConditions }).lean().exec();
            }
            case SyncModuleType.VOICE_BROADCAST:
                return models.voiceBroadcast.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            default:
                return null;
        }
    }

    private async findExistingTargetRecord(module: SyncModuleType, record: any): Promise<any> {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return this.rolesModel.findOne({ role_name: record.role_name || record.name }).lean().exec();
            case SyncModuleType.TENANT: {
                const orConditions = [
                    ...(record.company_code ? [{ company_code: record.company_code }] : []),
                    ...(record.tenant_name ? [{ tenant_name: record.tenant_name }] : []),
                    ...(record.domain ? [{ domain: record.domain }] : []),
                ];
                if (orConditions.length === 0) return null;
                return this.tenantModel.findOne({ $or: orConditions }).lean().exec();
            }
            case SyncModuleType.USER_ROLE:
                return this.userRoleModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.USER_GROUP:
                return this.userGroupModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.DID:
                if (record.assign_tenant_uuid !== undefined) {
                    return this.adminDidModel.findOne({ number: record.number }).lean().exec();
                }
                return this.didModel.findOne({ number: record.number }).lean().exec();
            case SyncModuleType.IP_MAPPING:
                if (record.tenant_uuid) {
                    return this.ipMappingModel.findOne({ ip: record.ip, tenant_uuid: record.tenant_uuid }).lean().exec();
                }
                return this.adminIpMappingModel.findOne({ ip: record.ip }).lean().exec();
            case SyncModuleType.TRUNK:
                return this.trunkModel.findOne({ name: record.name }).lean().exec();
            case SyncModuleType.OUTGOING_RULES:
                return this.outgoingRulesModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.BREAK_CODE:
                return this.breakcodeModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.DISPOSITION:
                return this.dispositionModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.CAMPAIGN:
                if (record._campaign_type === "INBOUND") {
                    return this.inboundCampaignModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
                } else if (record._campaign_type === "BLENDED") {
                    return this.blendedCampaignModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
                }
                return this.outboundCampaignModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return this.leadGroupModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.USERS: {
                const userOrConditions = [
                    ...(record.username ? [{ username: record.username }] : []),
                    ...(record.email ? [{ email: record.email }] : []),
                ];
                if (userOrConditions.length === 0) return null;
                return this.userModel.findOne({ $or: userOrConditions }).lean().exec();
            }
            case SyncModuleType.SIP_DEVICES:
                return this.extensionModel.findOne({ extension: record.extension, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            case SyncModuleType.USER_AND_SIP_DEVICES: {
                if (record._entity_type === "EXTENSION") {
                    return this.extensionModel.findOne({ extension: record.extension, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
                }
                const userOrConditions = [
                    ...(record.username ? [{ username: record.username }] : []),
                    ...(record.email ? [{ email: record.email }] : []),
                ];
                if (userOrConditions.length === 0) return null;
                return this.userModel.findOne({ $or: userOrConditions }).lean().exec();
            }
            case SyncModuleType.VOICE_BROADCAST:
                return this.voiceBroadcastModel.findOne({ name: record.name, ...(record.tenant_uuid ? { tenant_uuid: record.tenant_uuid } : {}) }).lean().exec();
            default:
                return null;
        }
    }

    private prepareRecordPayload(
        module: SyncModuleType,
        source: any,
        idMap: Record<string, string>,
        isNew: boolean,
        newUuid?: string,
    ): any {
        const payload = { ...source };

        delete payload._id;
        delete payload.__v;
        delete payload.createdAt;
        delete payload.updatedAt;
        delete payload._campaign_type;
        delete payload._entity_type;

        if (isNew && newUuid) {
            if (module === SyncModuleType.DISPOSITION) {
                payload.disposition_uuid = newUuid;
                // disposition.uuid is also unique; do not carry the source value into a new record
                if (payload.uuid) payload.uuid = newUuid;
            } else {
                payload.uuid = newUuid;
            }
        }

        if (payload.tenant_uuid && idMap[payload.tenant_uuid]) {
            payload.tenant_uuid = idMap[payload.tenant_uuid];
        }
        if (payload.role_uuid && idMap[payload.role_uuid]) {
            payload.role_uuid = idMap[payload.role_uuid];
        }
        if (payload.user_role_uuid && idMap[payload.user_role_uuid]) {
            payload.user_role_uuid = idMap[payload.user_role_uuid];
        }
        if (payload.user_group_uuid && idMap[payload.user_group_uuid]) {
            payload.user_group_uuid = idMap[payload.user_group_uuid];
        }
        if (payload.outgoing_rule_uuid && idMap[payload.outgoing_rule_uuid]) {
            payload.outgoing_rule_uuid = idMap[payload.outgoing_rule_uuid];
        }
        if (payload.campaign_uuid && idMap[payload.campaign_uuid]) {
            payload.campaign_uuid = idMap[payload.campaign_uuid];
        }
        if (payload.lead_group_uuid && idMap[payload.lead_group_uuid]) {
            payload.lead_group_uuid = idMap[payload.lead_group_uuid];
        }
        if (payload.user_uuid && idMap[payload.user_uuid]) {
            payload.user_uuid = idMap[payload.user_uuid];
        }

        if (module === SyncModuleType.OUTGOING_RULES && Array.isArray(payload.rules)) {
            payload.rules = payload.rules.map((rule: any) => ({
                ...rule,
                trunk_uuid: (rule.trunk_uuid && idMap[rule.trunk_uuid]) ? idMap[rule.trunk_uuid] : rule.trunk_uuid,
                failover_trunk_1_uuid: (rule.failover_trunk_1_uuid && idMap[rule.failover_trunk_1_uuid]) ? idMap[rule.failover_trunk_1_uuid] : rule.failover_trunk_1_uuid,
                failover_trunk_2_uuid: (rule.failover_trunk_2_uuid && idMap[rule.failover_trunk_2_uuid]) ? idMap[rule.failover_trunk_2_uuid] : rule.failover_trunk_2_uuid,
            }));
        }

        return payload;
    }

    /**
     * OVERWRITE payload: exact copy of the source document (UUIDs, foreign keys, nested config, metadata).
     * Foreign keys go through idMap, which is identity for records mirrored with source UUIDs.
     */
    private prepareOverwritePayload(module: SyncModuleType, source: any, idMap: Record<string, string>): any {
        const payload = this.prepareRecordPayload(module, source, idMap, false);
        // Restore metadata stripped by prepareRecordPayload so the target matches the source exactly
        for (const key of ["__v", "createdAt", "updatedAt"]) {
            if (source[key] === undefined) continue;
            // Records arriving via the JSON import endpoint carry dates as strings
            payload[key] = key !== "__v" && typeof source[key] === "string" ? new Date(source[key]) : source[key];
        }
        // FK remapping of rules adds keys with undefined values; the native driver would persist them as null
        if (Array.isArray(payload.rules)) {
            payload.rules = payload.rules.map((rule: any) =>
                this.isPlainObject(rule)
                    ? Object.keys(rule).reduce((acc: any, k) => (rule[k] !== undefined ? { ...acc, [k]: rule[k] } : acc), {})
                    : rule,
            );
        }
        return payload;
    }

    /**
     * UPDATE (merge) payload: flattens nested plain objects into dot-paths so that $set merges
     * them into the target instead of replacing whole sub-documents. Arrays/scalars are replaced.
     */
    private buildMergeSet(source: any, target: any, prefix = ""): Record<string, any> {
        const set: Record<string, any> = {};
        for (const [key, value] of Object.entries(source || {})) {
            const path = prefix ? `${prefix}.${key}` : key;
            const targetValue = target ? target[key] : undefined;
            const canRecurse =
                this.isPlainObject(value) &&
                this.isPlainObject(targetValue) &&
                Object.keys(value).length > 0 &&
                Object.keys(value).every((k) => !k.includes(".") && !k.startsWith("$"));
            if (canRecurse) {
                Object.assign(set, this.buildMergeSet(value, targetValue, path));
            } else {
                set[path] = value;
            }
        }
        return set;
    }

    private isPlainObject(value: any): boolean {
        if (value === null || typeof value !== "object") return false;
        const proto = Object.getPrototypeOf(value);
        return proto === Object.prototype || proto === null;
    }

    /**
     * Returns identifier fields of the payload (_id / uuid / disposition_uuid) that are already
     * used by a different document in the target collection (unique-index constraint).
     */
    private async findIdentifierConflicts(targetModel: Model<any>, payload: any, excludeId?: any): Promise<string[]> {
        const conflicts: string[] = [];
        for (const field of ["_id", "uuid", "disposition_uuid"]) {
            if (payload[field] === undefined || payload[field] === null) continue;
            if (field === "_id" && excludeId) continue;
            const query: any = { [field]: payload[field] };
            if (excludeId) query._id = { $ne: excludeId };
            const found = await targetModel.collection.findOne(query, { projection: { _id: 1 } });
            if (found) conflicts.push(field);
        }
        return conflicts;
    }

    private async findIdentifierConflict(targetModel: Model<any>, payload: any): Promise<string | null> {
        const conflicts = await this.findIdentifierConflicts(targetModel, payload);
        return conflicts.length ? conflicts.join(", ") : null;
    }

    resolveModuleModel(models: Record<string, Model<any>>, module: SyncModuleType, rawRecord?: any): Model<any> {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return models.roles;
            case SyncModuleType.TENANT:
                return models.tenant;
            case SyncModuleType.USER_ROLE:
                return models.userRole;
            case SyncModuleType.USER_GROUP:
                return models.userGroup;
            case SyncModuleType.DID:
                return rawRecord?.assign_tenant_uuid !== undefined ? models.adminDid : models.did;
            case SyncModuleType.IP_MAPPING:
                return rawRecord?.tenant_uuid ? models.ipMapping : models.adminIpMapping;
            case SyncModuleType.TRUNK:
                return models.trunk;
            case SyncModuleType.OUTGOING_RULES:
                return models.outgoingRules;
            case SyncModuleType.BREAK_CODE:
                return models.breakcode;
            case SyncModuleType.DISPOSITION:
                return models.disposition;
            case SyncModuleType.CAMPAIGN:
                if (rawRecord?._campaign_type === "INBOUND") return models.inboundCampaign;
                if (rawRecord?._campaign_type === "BLENDED") return models.blendedCampaign;
                return models.outboundCampaign;
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return models.leadGroup;
            case SyncModuleType.USERS:
                return models.user;
            case SyncModuleType.SIP_DEVICES:
                return models.extension;
            case SyncModuleType.USER_AND_SIP_DEVICES:
                return rawRecord?._entity_type === "EXTENSION" ? models.extension : models.user;
            case SyncModuleType.VOICE_BROADCAST:
                return models.voiceBroadcast;
            default:
                throw new Error(`Unsupported module: ${module}`);
        }
    }

    /**
     * OVERWRITE: replace the whole target document with the source copy (no merge; target-only
     * fields are removed). MongoDB's _id is immutable, so only the target _id is retained.
     */
    async overwriteTargetRecordOnConn(
        conn: Connection,
        module: SyncModuleType,
        existingRecord: any,
        payload: any,
        rawRecord: any,
    ): Promise<{
        operation: string;
        filter: any;
        collection: string;
        matchedCount: number;
        modifiedCount: number;
        upsertedCount: number;
        acknowledged: boolean;
        targetUuid: string;
    }> {
        const models = this.getModuleModels(conn);
        const targetModel = this.resolveModuleModel(models, module, rawRecord);
        const filter = { _id: existingRecord._id };
        const replacement = { ...payload };
        delete replacement._id;

        // Only when a unique-index constraint would be violated, keep the target's own identifier
        const conflicts = await this.findIdentifierConflicts(targetModel, replacement, existingRecord._id);
        for (const field of conflicts) {
            this.logger.warn(
                `[SYNC STRATEGY] OVERWRITE: source ${field}=${replacement[field]} is used by another target record in ${targetModel.collection.name}; keeping target ${field}=${existingRecord[field]}`,
            );
            if (existingRecord[field] !== undefined) replacement[field] = existingRecord[field];
            else delete replacement[field];
        }

        const writeResult = await targetModel.collection.replaceOne(filter, replacement);

        if (!writeResult || !writeResult.acknowledged) {
            throw new Error(`MongoDB write not acknowledged by target database for ${module}`);
        }
        if (writeResult.matchedCount === 0) {
            throw new Error(`Target record not found for overwrite (matchedCount: 0) with filter: ${JSON.stringify(filter)}`);
        }

        return {
            operation: "replaceOne",
            filter,
            collection: targetModel.collection.name,
            matchedCount: writeResult.matchedCount,
            modifiedCount: writeResult.modifiedCount,
            upsertedCount: writeResult.upsertedCount || 0,
            acknowledged: writeResult.acknowledged,
            targetUuid: replacement.uuid || replacement.disposition_uuid || existingRecord._id?.toString(),
        };
    }

    resolveCollectionName(models: Record<string, Model<any>>, module: SyncModuleType, rawRecord?: any): string {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return models.roles.collection.name;
            case SyncModuleType.TENANT:
                return models.tenant.collection.name;
            case SyncModuleType.USER_ROLE:
                return models.userRole.collection.name;
            case SyncModuleType.USER_GROUP:
                return models.userGroup.collection.name;
            case SyncModuleType.DID:
                return (rawRecord?.assign_tenant_uuid !== undefined ? models.adminDid : models.did).collection.name;
            case SyncModuleType.IP_MAPPING:
                return (rawRecord?.tenant_uuid ? models.ipMapping : models.adminIpMapping).collection.name;
            case SyncModuleType.TRUNK:
                return models.trunk.collection.name;
            case SyncModuleType.OUTGOING_RULES:
                return models.outgoingRules.collection.name;
            case SyncModuleType.BREAK_CODE:
                return models.breakcode.collection.name;
            case SyncModuleType.DISPOSITION:
                return models.disposition.collection.name;
            case SyncModuleType.CAMPAIGN:
                if (rawRecord?._campaign_type === "INBOUND") return models.inboundCampaign.collection.name;
                if (rawRecord?._campaign_type === "BLENDED") return models.blendedCampaign.collection.name;
                return models.outboundCampaign.collection.name;
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return models.leadGroup.collection.name;
            case SyncModuleType.USERS:
                return models.user.collection.name;
            case SyncModuleType.SIP_DEVICES:
                return models.extension.collection.name;
            case SyncModuleType.USER_AND_SIP_DEVICES:
                return (rawRecord?._entity_type === "EXTENSION" ? models.extension : models.user).collection.name;
            case SyncModuleType.VOICE_BROADCAST:
                return models.voiceBroadcast.collection.name;
            default:
                return "unknown_collection";
        }
    }

    async createTargetRecordOnConn(
        conn: Connection,
        module: SyncModuleType,
        payload: any,
        rawRecord: any,
    ): Promise<{
        operation: string;
        filter: any;
        collection: string;
        matchedCount: number;
        modifiedCount: number;
        upsertedCount: number;
        acknowledged: boolean;
        insertedId?: string;
    }> {
        const models = this.getModuleModels(conn);
        let targetModel: Model<any>;
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                targetModel = models.roles;
                break;
            case SyncModuleType.TENANT:
                targetModel = models.tenant;
                break;
            case SyncModuleType.USER_ROLE:
                targetModel = models.userRole;
                break;
            case SyncModuleType.USER_GROUP:
                targetModel = models.userGroup;
                break;
            case SyncModuleType.DID:
                targetModel = rawRecord.assign_tenant_uuid !== undefined ? models.adminDid : models.did;
                break;
            case SyncModuleType.IP_MAPPING:
                targetModel = rawRecord.tenant_uuid ? models.ipMapping : models.adminIpMapping;
                break;
            case SyncModuleType.TRUNK:
                targetModel = models.trunk;
                break;
            case SyncModuleType.OUTGOING_RULES:
                targetModel = models.outgoingRules;
                break;
            case SyncModuleType.BREAK_CODE:
                targetModel = models.breakcode;
                break;
            case SyncModuleType.DISPOSITION:
                targetModel = models.disposition;
                break;
            case SyncModuleType.CAMPAIGN:
                if (rawRecord._campaign_type === "INBOUND") {
                    targetModel = models.inboundCampaign;
                } else if (rawRecord._campaign_type === "BLENDED") {
                    targetModel = models.blendedCampaign;
                } else {
                    targetModel = models.outboundCampaign;
                }
                break;
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                targetModel = models.leadGroup;
                break;
            case SyncModuleType.USERS:
                targetModel = models.user;
                break;
            case SyncModuleType.SIP_DEVICES:
                targetModel = models.extension;
                break;
            case SyncModuleType.USER_AND_SIP_DEVICES:
                targetModel = rawRecord._entity_type === "EXTENSION" ? models.extension : models.user;
                break;
            case SyncModuleType.VOICE_BROADCAST:
                targetModel = models.voiceBroadcast;
                break;
            default:
                throw new Error(`Unsupported module for creation: ${module}`);
        }

        const savedDoc = await new targetModel(payload).save();
        if (!savedDoc || !savedDoc._id) {
            throw new Error(`MongoDB write failed: Document insertion not confirmed for ${module}`);
        }

        return {
            operation: "save (insertOne)",
            filter: { _id: savedDoc._id },
            collection: targetModel.collection.name,
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1,
            acknowledged: true,
            insertedId: savedDoc._id.toString(),
        };
    }

    async updateTargetRecordOnConn(
        conn: Connection,
        module: SyncModuleType,
        existingRecord: any,
        payload: any,
        rawRecord: any,
    ): Promise<{
        operation: string;
        filter: any;
        collection: string;
        matchedCount: number;
        modifiedCount: number;
        upsertedCount: number;
        acknowledged: boolean;
    }> {
        const models = this.getModuleModels(conn);
        const existingUuid = existingRecord?.uuid || existingRecord?.disposition_uuid;
        // Prioritize immutable _id, fallback to uuid
        const filter: any = existingRecord?._id
            ? { _id: existingRecord._id }
            : module === SyncModuleType.DISPOSITION
            ? { disposition_uuid: existingUuid }
            : { uuid: existingUuid };

        const updatePayload = {
            ...payload,
            updatedAt: new Date(),
        };

        let targetModel: Model<any>;
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                targetModel = models.roles;
                break;
            case SyncModuleType.TENANT:
                targetModel = models.tenant;
                break;
            case SyncModuleType.USER_ROLE:
                targetModel = models.userRole;
                break;
            case SyncModuleType.USER_GROUP:
                targetModel = models.userGroup;
                break;
            case SyncModuleType.DID:
                targetModel = rawRecord.assign_tenant_uuid !== undefined ? models.adminDid : models.did;
                break;
            case SyncModuleType.IP_MAPPING:
                targetModel = rawRecord.tenant_uuid ? models.ipMapping : models.adminIpMapping;
                break;
            case SyncModuleType.TRUNK:
                targetModel = models.trunk;
                break;
            case SyncModuleType.OUTGOING_RULES:
                targetModel = models.outgoingRules;
                break;
            case SyncModuleType.BREAK_CODE:
                targetModel = models.breakcode;
                break;
            case SyncModuleType.DISPOSITION:
                targetModel = models.disposition;
                break;
            case SyncModuleType.CAMPAIGN:
                if (rawRecord._campaign_type === "INBOUND") {
                    targetModel = models.inboundCampaign;
                } else if (rawRecord._campaign_type === "BLENDED") {
                    targetModel = models.blendedCampaign;
                } else {
                    targetModel = models.outboundCampaign;
                }
                break;
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                targetModel = models.leadGroup;
                break;
            case SyncModuleType.USERS:
                targetModel = models.user;
                break;
            case SyncModuleType.SIP_DEVICES:
                targetModel = models.extension;
                break;
            case SyncModuleType.USER_AND_SIP_DEVICES:
                targetModel = rawRecord._entity_type === "EXTENSION" ? models.extension : models.user;
                break;
            case SyncModuleType.VOICE_BROADCAST:
                targetModel = models.voiceBroadcast;
                break;
            default:
                throw new Error(`Unsupported module for update: ${module}`);
        }

        const writeResult = await targetModel.updateOne(filter, { $set: updatePayload }).exec();

        if (!writeResult || !writeResult.acknowledged) {
            throw new Error(`MongoDB write not acknowledged by target database for ${module}`);
        }
        if (writeResult.matchedCount === 0 && writeResult.upsertedCount === 0) {
            throw new Error(`Target record not found for update (matchedCount: 0) with filter: ${JSON.stringify(filter)}`);
        }

        return {
            operation: "updateOne",
            filter,
            collection: targetModel.collection.name,
            matchedCount: writeResult.matchedCount,
            modifiedCount: writeResult.modifiedCount,
            upsertedCount: writeResult.upsertedCount || 0,
            acknowledged: writeResult.acknowledged,
        };
    }

    private async createTargetRecord(module: SyncModuleType, payload: any, rawRecord: any): Promise<any> {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return new this.rolesModel(payload).save();
            case SyncModuleType.TENANT:
                return new this.tenantModel(payload).save();
            case SyncModuleType.USER_ROLE:
                return new this.userRoleModel(payload).save();
            case SyncModuleType.USER_GROUP:
                return new this.userGroupModel(payload).save();
            case SyncModuleType.DID:
                if (rawRecord.assign_tenant_uuid !== undefined) {
                    return new this.adminDidModel(payload).save();
                }
                return new this.didModel(payload).save();
            case SyncModuleType.IP_MAPPING:
                if (rawRecord.tenant_uuid) {
                    return new this.ipMappingModel(payload).save();
                }
                return new this.adminIpMappingModel(payload).save();
            case SyncModuleType.TRUNK:
                return new this.trunkModel(payload).save();
            case SyncModuleType.OUTGOING_RULES:
                return new this.outgoingRulesModel(payload).save();
            case SyncModuleType.BREAK_CODE:
                return new this.breakcodeModel(payload).save();
            case SyncModuleType.DISPOSITION:
                return new this.dispositionModel(payload).save();
            case SyncModuleType.CAMPAIGN:
                if (rawRecord._campaign_type === "INBOUND") {
                    return new this.inboundCampaignModel(payload).save();
                } else if (rawRecord._campaign_type === "BLENDED") {
                    return new this.blendedCampaignModel(payload).save();
                }
                return new this.outboundCampaignModel(payload).save();
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return new this.leadGroupModel(payload).save();
            case SyncModuleType.USERS:
                return new this.userModel(payload).save();
            case SyncModuleType.SIP_DEVICES:
                return new this.extensionModel(payload).save();
            case SyncModuleType.USER_AND_SIP_DEVICES:
                if (rawRecord._entity_type === "EXTENSION") {
                    return new this.extensionModel(payload).save();
                }
                return new this.userModel(payload).save();
            case SyncModuleType.VOICE_BROADCAST:
                return new this.voiceBroadcastModel(payload).save();
        }
    }

    private async updateTargetRecord(module: SyncModuleType, targetUuid: string, payload: any, rawRecord: any): Promise<any> {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return this.rolesModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.TENANT:
                return this.tenantModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.USER_ROLE:
                return this.userRoleModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.USER_GROUP:
                return this.userGroupModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.DID:
                if (rawRecord.assign_tenant_uuid !== undefined) {
                    return this.adminDidModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
                }
                return this.didModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.IP_MAPPING:
                if (rawRecord.tenant_uuid) {
                    return this.ipMappingModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
                }
                return this.adminIpMappingModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.TRUNK:
                return this.trunkModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.OUTGOING_RULES:
                return this.outgoingRulesModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.BREAK_CODE:
                return this.breakcodeModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.DISPOSITION:
                return this.dispositionModel.updateOne({ disposition_uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.CAMPAIGN:
                if (rawRecord._campaign_type === "INBOUND") {
                    return this.inboundCampaignModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
                } else if (rawRecord._campaign_type === "BLENDED") {
                    return this.blendedCampaignModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
                }
                return this.outboundCampaignModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return this.leadGroupModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.USERS:
                return this.userModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.SIP_DEVICES:
                return this.extensionModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.USER_AND_SIP_DEVICES:
                if (rawRecord._entity_type === "EXTENSION") {
                    return this.extensionModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
                }
                return this.userModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
            case SyncModuleType.VOICE_BROADCAST:
                return this.voiceBroadcastModel.updateOne({ uuid: targetUuid }, { $set: payload }).exec();
        }
    }

    private getRecordIdentifier(module: SyncModuleType, record: any): string {
        switch (module) {
            case SyncModuleType.TENANT_ROLE:
                return record.role_name || record.name || "Tenant Role";
            case SyncModuleType.TENANT:
                return record.tenant_name || record.company_code || record.domain || record.username || "Tenant";
            case SyncModuleType.USER_ROLE:
                return record.name || "User Role";
            case SyncModuleType.USER_GROUP:
                return record.name || "User Group";
            case SyncModuleType.DID:
                return record.number ? `${record.number}` : "DID Number";
            case SyncModuleType.IP_MAPPING:
                return record.ip ? `${record.ip}${record.prefix ? ` (${record.prefix})` : ""}` : "IP Mapping";
            case SyncModuleType.TRUNK:
                return record.name || record.domain || "Trunk";
            case SyncModuleType.OUTGOING_RULES:
                return record.name || "Outgoing Rule";
            case SyncModuleType.BREAK_CODE:
                return record.name || record.break_code || "Break Code";
            case SyncModuleType.DISPOSITION:
                return record.name || record.code || "Disposition";
            case SyncModuleType.CAMPAIGN:
                return record.name || "Campaign";
            case SyncModuleType.CAMPAIGN_LEAD_GROUP:
                return record.name || "Lead Group";
            case SyncModuleType.USERS:
                return record.username || record.name || record.email || "User";
            case SyncModuleType.SIP_DEVICES:
                return record.device_name || record.extension || record.username || "SIP Extension";
            case SyncModuleType.USER_AND_SIP_DEVICES:
                if (record._entity_type === "EXTENSION") {
                    return record.device_name || record.extension || record.username || "SIP Extension";
                }
                return record.username || record.name || record.email || "User";
            case SyncModuleType.VOICE_BROADCAST:
                return record.name || "Voice Broadcast";
            default:
                return (
                    record.name ||
                    record.role_name ||
                    record.tenant_name ||
                    record.company_code ||
                    record.username ||
                    record.number ||
                    record.extension ||
                    record.device_name ||
                    "Record"
                );
        }
    }
}
