import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";

export type TenantreportsearchDcoument = TenantSummary & Document;

@Schema({ collection : "tenant_report_search" , timestamps : true , toJSON : { virtuals : true , getters : true} , toObject : { virtuals : true , getters : true}})

export class  TenantSummary {

    @Prop()
    callstart : String

    @Prop()
    callend : String

    // @Prop({ required: false })
    @Prop()
    tenant_uuid: string; // Store the user UUID if a specific user was selected

    @Prop()
    user_uuid: String
  
    @Prop({ default: 0 }) // Default flag to 0
    flag: number;
}

 let tenantreportsearchSummary = SchemaFactory.createForClass(TenantSummary);
 tenantreportsearchSummary.virtual('user' , {
    ref: DispositionSchema.name,
    localField: 'user_uuid',
    foreignField: 'user_uuid',
})
export { tenantreportsearchSummary }

