import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { StateSchema } from "src/modules/state/schema/state.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { TimezoneSchema } from "src/modules/timezone/schema/timezone.schema";

export type AreaCodeDocument = AreaCodeSchema & Document;

@Schema({
    collection: "manage_area_code", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})
export class AreaCodeSchema {

    @Prop({ type: String, default: function radomUUID() { return randomUUID() } })
    uuid: string

    @Prop()
    state_id: String

    @Prop()
    code: String

    @Prop()
    comment: String

    @Prop()
    type: String

    @Prop()
    start_time: String

    @Prop()
    end_time: String

    @Prop()
    tenant_uuid: String

    @Prop()
    timezone_uuid: String

    @Prop()
    day_light_toggle: String

}

let areaCodeSchema = SchemaFactory.createForClass(AreaCodeSchema);

areaCodeSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

areaCodeSchema.virtual('state', {
    ref: StateSchema.name,
    localField: 'state_id',
    foreignField: 'uuid',
})

areaCodeSchema.virtual('timezone', {
    ref: TimezoneSchema.name,
    localField: 'timezone_uuid',
    foreignField: 'uuid',
})
export { areaCodeSchema }