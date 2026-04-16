import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { FtpDto } from "../dto/ftp.dto";
import { FtpDocument,FtpSchema } from "../schema/ftp.schema";

@Injectable()

export class FtpService {

    /*
    @Usage              : To load notes schema and other libraries
    @Param @InjectModel : It will load notes schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [notes,commonDbFn] 
    */

    constructor(
        @InjectModel(FtpSchema.name) private readonly ftp: Model<FtpDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage             : To get all notes
    @Param queryParams : It will contain logged in user info
    @return Object     : Array of an object with total count of notes with data 
    */

    async findAll(queryParams) {
        const {tenant_uuid} = queryParams;
        let result = await this.ftp.find({tenant_uuid}).exec();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,result);
    }

    /*
    @Usage                          : To update ftp details
    @Param ftpDto               : Request DTO
    @return success / error object  : { Ftp details updated successfully }
    */

    async update_ftp_details(ftpDto){
	 const {tenant_uuid} = ftpDto;
        await this.ftp.updateOne({tenant_uuid},ftpDto,{upsert : true}).exec();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,`Ftp details updated successfully`)
    }

}

