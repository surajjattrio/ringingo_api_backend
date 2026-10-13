import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type PipelineStageDocument = PipelineStageSchema & Document;
export type PipelineLeadDocument = PipelineLeadSchema & Document;

/* ────────────────── PIPELINE STAGE ────────────────── */
@Schema({ collection: "pipeline_stage", timestamps: true })
export class PipelineStageSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    stage_uuid: string;

    @Prop({ required: true })
    name: string;

    @Prop({ default: "#342df2" })
    color: string;

    @Prop({ default: "0" })
    status: string;         // 0=active, 1=inactive

    @Prop({ required: true })
    tenant_uuid: string;

    @Prop({ default: 0 })
    sort_order: number;
}

export const pipelineStageSchema = SchemaFactory.createForClass(PipelineStageSchema);

/* ────────────────── PIPELINE LEAD ────────────────── */
@Schema({ collection: "pipeline_lead", timestamps: true })
export class PipelineLeadSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    lead_uuid: string;

    @Prop({ required: true })
    stage_uuid: string;

    @Prop({ required: true })
    tenant_uuid: string;

    @Prop()
    phone: string;

    @Prop()
    name: string;

    @Prop()
    email: string;

    @Prop({ default: "Medium" })
    priority: string;       // High | Medium | Low

    @Prop({ default: "0" })
    value: string;

    @Prop({ default: () => [] })
    tags: string[];

    @Prop()
    campaign_name: string;

    @Prop()
    campaign_uuid: string;

    @Prop()
    lead_group_name: string;

    @Prop()
    lead_group_uuid: string;

    @Prop()
    user_name: string;

    @Prop()
    user_uuid: string;

    @Prop()
    lead_management_uuid: string;

    @Prop({ default: "active" })
    status: string;
}

export const pipelineLeadSchema = SchemaFactory.createForClass(PipelineLeadSchema);

/* ────────────────── PIPELINE ASSIGNMENT CONFIG ────────────────── */
export type PipelineAssignmentConfigDocument = PipelineAssignmentConfigSchema & Document;

@Schema({ collection: "pipeline_assignment_config", timestamps: true })
export class PipelineAssignmentConfigSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    config_uuid: string;

    /** One config per tenant */
    @Prop({ required: true, unique: true })
    tenant_uuid: string;

    /** Master switch — if false, no auto-assignment happens */
    @Prop({ default: false })
    enabled: boolean;

    /**
     * Ordered list of users to assign leads to.
     * frequency = how many consecutive leads this user gets before rotating.
     */
    @Prop({
        type: [
            {
                user_uuid:  { type: String },
                user_name:  { type: String },
                frequency:  { type: Number, default: 1, min: 1, max: 100 },
            }
        ],
        default: [],
    })
    users: { user_uuid: string; user_name: string; frequency: number }[];

    /** Index into users[] of who gets the next lead */
    @Prop({ default: 0 })
    current_user_index: number;

    /** How many leads current user has already received in this rotation slot */
    @Prop({ default: 0 })
    current_user_count: number;

    /**
     * Auto Lead Import — when true, any new lead created in Lead Management
     * whose lead_status matches one of auto_import_dispositions is automatically
     * imported into the pipeline board (same logic as manual import).
     */
    @Prop({ default: false })
    auto_import: boolean;

    /** Disposition UUIDs to watch when auto_import is enabled */
    @Prop({ type: [String], default: [] })
    auto_import_dispositions: string[];
}

export const pipelineAssignmentConfigSchema = SchemaFactory.createForClass(PipelineAssignmentConfigSchema);
