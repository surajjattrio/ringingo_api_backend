import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LeadResetJobDocument = LeadResetJobSchema & Document;

/*
@Usage : Tracks a lead-reset job published to RabbitMQ so the frontend can
         poll for its status instead of blocking on the HTTP request. Mirrors
         RequestSchedulerSchema's pending/inprogress/completed/failed
         convention (src/modules/request-scheduler/schema/request-scheduler.schema.ts).
*/
@Schema({ collection: "lead_reset_jobs", timestamps: true })
export class LeadResetJobSchema {

    @Prop({ unique: true })
    job_uuid: string;

    @Prop()
    lead_group_uuid: string;

    @Prop()
    campaign_uuid: string;

    @Prop()
    tenant_uuid: string;

    @Prop({
        type: String,
        enum: ["pending", "inprogress", "completed", "failed"],
        default: "pending",
    })
    status: string;

    @Prop({ type: Object, default: null })
    result: Record<string, any>;

    @Prop({ default: "" })
    error_message: string;
}

export const leadResetJobSchema = SchemaFactory.createForClass(LeadResetJobSchema);

/*
@Usage : A job is only ever read by the frontend's short-lived status poll —
         once it's completed/failed there's nothing left to look up, so it
         doesn't need to live forever. This is a partial TTL index: MongoDB's
         background TTL monitor (runs ~every 60s on its own, no cron job here)
         deletes a document 24h after its last `updatedAt` write, but ONLY if
         `status` is completed/failed — the partialFilterExpression means a
         long-running pending/inprogress job is never at risk of being swept
         mid-flight. Requires autoIndex (Mongoose's default, not overridden
         anywhere in this project) so it gets created automatically on next
         boot — verify with db.lead_reset_jobs.getIndexes() if in doubt.
*/
leadResetJobSchema.index(
    { updatedAt: 1 },
    {
        expireAfterSeconds: 60 * 60 * 24, // 24h after the job's last update
        partialFilterExpression: { status: { $in: ["completed", "failed"] } },
    },
);
