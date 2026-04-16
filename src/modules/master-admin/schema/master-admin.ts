import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsEmail } from "class-validator";
import { Document } from "mongoose";


export type MasterAdminDocument = MasterAdmin & Document;

@Schema({ collection: 'master_admin' , timestamps:true})
export class MasterAdmin {

    @Prop()
    master_admin_uuid : string

    @Prop()
    username : string

    @Prop()
    password : string

    @Prop()
    @IsEmail()
    email : string

    @Prop()
    role ? : string		
}

export const MasterAdminSchema = SchemaFactory.createForClass(MasterAdmin);
