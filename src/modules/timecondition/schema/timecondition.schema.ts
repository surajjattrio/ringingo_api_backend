import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

let condition = [
    {
        "start_hour": "02",
        "start_minute": "00",
        "end_hour": "23",
        "end_minute": "59",
        "weekday_start": "0",
        "weekday_end": "6",
        "monthday_start": "01",
        "monthday_end": "31",
        "start_month": "1",
        "end_month": "12",
        "start_year": "2023",
        "end_year": "2023",
        "extension_calltype": "0",
        "extension_destination": "123456",
        "priority": "1"
    }
]
export type TimeconditionDocument = TimeconditionSchema & Document;

@Schema({ collection : "time_condition" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })
export class TimeconditionSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID();} })
    uuid: string

    @Prop()
    name : String

    @Prop()
    status : String

    @Prop()
    failover_routing_type : String

    @Prop()
    failover_routing_options : String

    @Prop({schema : condition , type : Array})
    condition : Object

    @Prop()
    tenant_uuid : String

    @Prop()
    user_uuid : String

    @Prop()
    fail_over_routing_name : String
}

let timeconditionSchema = SchemaFactory.createForClass(TimeconditionSchema);
timeconditionSchema.virtual('tenant' , {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
timeconditionSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})

export { timeconditionSchema }
