import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateNotesDto } from "../dto/create-notes.dto";
import { NotesDocument, NotesSchema } from "../schema/notes.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";

@Injectable()

export class NotesService {

    /*
    @Usage              : To load notes schema and other libraries
    @Param @InjectModel : It will load notes schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [notes,commonDbFn] 
    */

    constructor(
        @InjectModel(NotesSchema.name) private readonly notes: Model<NotesDocument>,
	@InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                 : To create a new note
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async create(createNotesDto: CreateNotesDto) {
	const { cdrs_uuid, lead_uuid } = createNotesDto;
        createNotesDto.user_uuid = createNotesDto.uuid;
        let logMessages = {
            logSuccessMsg: "Note created successfully \n"
        }
	let leadUUID;
        if (lead_uuid == "") {
            let leadDetails = await this.cdrs.findOne({ custom_callid: cdrs_uuid }).exec();
            leadUUID = leadDetails?.lead_uuid;
            createNotesDto.lead_uuid = leadUUID;
        }
        return this.commonDbFn.insert(this.notes, createNotesDto, JSON.stringify(logMessages));
    }

    /*
    @Usage             : To get all notes
    @Param queryParams : It will contain logged in user info
    @return Object     : Array of an object with total count of notes with data 
    */

    async findAll(queryParams) {
        let populateFields = [{ path: "lead-management", select: "first_name last_name" }, { path: "user", select: "username -_id -uuid" }];
        return this.commonDbFn.findAllWithPagination(this.notes, queryParams, "", populateFields, "", false);
    }

    /*
    @Usage          : To get single note  based on uuid
    @Param uuid     : Search note by uuid
    @return Object  : Result of note 
    */

    async findOne(cdrs_uuid: string , queryParam : any) {
        const { uuid , role , tenant_uuid } = queryParam;
        let logMessages = {
            logErrorMsg: `Note not found by uuid : ${cdrs_uuid} \n`,
            logSuccessMsg: `Note success fetched by uuid : ${cdrs_uuid} \n`
        }
        let populateFields = [{ path: "lead-management", select: "first_name last_name" }, { path: "user", select: "username -_id -uuid" }];
	let result;
       // let result = await this.notes.find({ $and: [{ $or: [{ user_uuid : uuid }] }, { $or: [{cdrs_uuid},{lead_uuid:cdrs_uuid} ] }] },{_id:0}).populate(populateFields).sort({ _id: -1 }).exec();
	if (role == "agent") {
            result = await this.notes.find({ $and: [{ $or: [{ user_uuid: uuid }] }, { $or: [{ cdrs_uuid }, { lead_uuid: cdrs_uuid }] }] }, { _id: 0 }).populate(populateFields).sort({ _id: -1 }).exec();
        } else {
            result = await this.notes.find({ $and: [{ $or: [{ tenant_uuid }] }, { $or: [{cdrs_uuid},{lead_uuid:cdrs_uuid} ] }] },{_id:0}).populate(populateFields).sort({ _id: -1 }).exec();
        }
	return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,result);
    }

}
