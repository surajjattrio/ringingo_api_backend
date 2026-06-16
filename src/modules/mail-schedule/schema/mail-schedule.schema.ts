import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type MailScheduleDocument = MailScheduleSchema & Document;

@Schema({
    collection: "mail_schedule",
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
    strict: false,
})
export class MailScheduleSchema {

    @Prop({
        type: String,
        default: () => randomUUID(),
        unique: true,
        index: true,
    })
    uuid: string;

    @Prop({
        type: String,
        default: "",
        index: true,
    })
    tenant_uuid: string;

    @Prop({
        type: String,
        default: "",
        index: true,
    })
    user_uuid: string;

    @Prop({
        type: String,
        default: "",
    })
    name: string;

    @Prop({
        type: String,
        default: "",
    })
    report_type: string;

    @Prop({
        type: Date,
        default: null,
    })
    startDate: Date;

    @Prop({
        type: Date,
        default: null,
    })
    endDate: Date;

    @Prop({
        type: String,
        default: "",
    })
    timing: string;

    @Prop({
        type: String,
        default: "0", // 0 for active, 1 for inactive
    })
    status: string;

    @Prop({
        type: String,
        default: "",
    })
    email_config_uuid: string;

}

const mailScheduleSchema = SchemaFactory.createForClass(MailScheduleSchema);

// ---------- Indexes ----------

mailScheduleSchema.index(
    { uuid: 1 },
    { unique: true },
);

mailScheduleSchema.index({
    tenant_uuid: 1,
});

mailScheduleSchema.index({
    user_uuid: 1,
});

mailScheduleSchema.index({
    createdAt: -1,
});

export { mailScheduleSchema };
