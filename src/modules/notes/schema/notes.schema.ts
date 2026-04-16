import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type NotesDocument = NotesSchema & Document;

@Schema({ collection : "notes" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class NotesSchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() } , unique : true})
    note_uuid : String
    
    @Prop()
    cdrs_uuid : String

    @Prop()
    lead_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    user_uuid : String

    @Prop()
    comment : String
}

let notesSchema = SchemaFactory.createForClass(NotesSchema);

notesSchema.virtual('lead-management' , {
    ref: LeadManagementSchema.name,
    localField: 'lead_uuid',
    foreignField: 'lead_management_uuid',
})
notesSchema.virtual('user' , {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
export { notesSchema }
