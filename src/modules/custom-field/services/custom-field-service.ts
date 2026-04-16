import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CustomFieldDocument, CustomFieldSchema } from "../schema/custom-field-schema";
import { CustomFieldDto } from "../dto/custom-field-dto";
import { LeadGroupSchema } from '../../lead-group/schema/lead-group.schema';


@Injectable()

export class CustomFieldsService {

     /*
     @Usage              : To load custom_fields schema and other libraries
     @Param @InjectModel : It will load custom_fields schema
     @Param commonDbFn   : To use commonly created mongoDB functions
     @return Object      : [custom_fields,commonDbFn]
     */

     constructor(
          @InjectModel( CustomFieldSchema.name ) private readonly custom_fields: Model<CustomFieldDocument>,
          private readonly commonDbFn: CommonDBFunctions,

          @InjectModel(LeadGroupSchema.name) 
          private readonly leadGroupModel: Model<any>,

     ) { }

     /*
     @Usage             : To get records based on limit,page,search
     @Param queryParams : It will contain page(default=1),limit(default=10),search
     @return Object     : Array of an object with total count of custom field with data
     */

     async findAll ( queryParams ) {
          let searchFields = [ "field_name", "field_label", 'field_placeholder' ];
          let populateFields = [ { path: "tenant", select: 'username tenant_name' }];
          const result = await  this.commonDbFn.findAllWithPagination( this.custom_fields, queryParams, searchFields, populateFields );
           // Post-process: manually populate lead_groups for each record
     if (result && result.data) {
          for (let i = 0; i < result.data.length; i++) {
               const field = result.data[i];
               
               // Convert comma-separated string to array
               const leadGroupUuids = field.lead_group_uuid
                    ? field.lead_group_uuid.split(',').map(s => s.trim()).filter(Boolean)
                    : [];

               // Find all matching lead groups
               const leadGroups = await this.leadGroupModel.find(
                    { uuid: { $in: leadGroupUuids } },
                    'name uuid'
               ).lean();

               // Add to the result
               field.lead_group_uuid = leadGroupUuids; // Convert to array
               field.lead_group = leadGroups; // Add populated lead groups
          }
     }

     return result;
     }

     /*
    @Usage              : To search users using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of users with data
    */

     async advancedSearch ( searchParams ) {
          // let populateFields = [  { path: "tenant", select: 'tenant_name username' } ];
          return this.commonDbFn.advancedSearch( this.custom_fields, searchParams );
     }

     /*
     @Usage                     : First it will check whether given name exist or not , if not then new custom fields will be created else it will throw error
     @Param createStickyAgentDto : Request paramter that we set into dto
     @return Object             : Success / Error
     */

     async create ( customfielddto: CustomFieldDto ) {
          const { field_name, lead_group_uuid } = customfielddto;

          console.log(lead_group_uuid ,"lead_group_uuid....")
          console.log(field_name ,"field_name....")

          // Convert array to comma-separated string for storage
          const leadGroupUuidString = Array.isArray(lead_group_uuid) 
                                        ? lead_group_uuid.join(',') 
                                        : lead_group_uuid;

          const dtoToStore = {
               ...customfielddto,
               lead_group_uuid: leadGroupUuidString // Store as "uuid1,uuid2,uuid3"
          };
                              
          let where = [ { field_name} ];
          let logMessages = {
               logErrorMsg: "Custom Field already exist \n",
               logSuccessMsg: "Custom Field created successfully \n"
          }
          return this.commonDbFn.findAndInsert( this.custom_fields, where, dtoToStore, JSON.stringify( logMessages ), "and" );
     }


     /*
    @Usage          : To get single custom field based on uuid
    @Param uuid     : Search custom field by uuid
    @return Object  : Result of custom field
    */

     async findOne ( uuid: string ) {
          let logMessages = {
               logErrorMsg: `custom field not found by uuid : ${uuid} \n`,
               logSuccessMsg: `custom field success fetched by uuid : ${uuid} \n`
          }
          return this.commonDbFn.findOne( this.custom_fields, uuid, JSON.stringify( logMessages ) );
     }

     /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

async update(uuid: string, customfielddto: CustomFieldDto) {
     const { field_name, lead_group_uuid } = customfielddto;
     
     // Convert array to comma-separated string for storage
     const leadGroupUuidString = Array.isArray(lead_group_uuid) 
          ? lead_group_uuid.join(',') 
          : lead_group_uuid;

     const dtoToUpdate = {
          ...customfielddto,
          lead_group_uuid: leadGroupUuidString // Store as comma-separated string
     };

     const getcustomfields = await this.custom_fields.findOne({ uuid }).exec();
     
     if (getcustomfields?.field_name != field_name) {
          // Check if custom field with same name exists
          // since one field can now belong to multiple lead groups
          const checkcustomfieldexist = await this.custom_fields
               .find({ field_name })
               .countDocuments()
               .exec();
               
          if (checkcustomfieldexist > 0) {
               Logger.error("Custom Field already exist \n", putMethod);
               return this.commonDbFn.sendResponseWithMessage(
                    HttpStatus.CONFLICT, 
                    `Custom Field already exist`
               );
          }
     }
     
     let logMessages = {
          logErrorMsg: `Custom Field not found by uuid : ${uuid} \n`,
          logSuccessMsg: `Custom Field updated successfully by uuid : ${uuid} \n`
     };
     
     return this.commonDbFn.update(
          this.custom_fields, 
          uuid, 
          dtoToUpdate, 
          JSON.stringify(logMessages)
     );
}
     /*
    @Usage         : Delete single or multiple custom field using uuid
    @Param uuid    : To delete single custom field pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

     async remove ( uuid: string ) {
          let logMessages = {
               logErrorMsg: `custom field not exist by uuid : ${uuid} \n`,
               logSuccessMsg: `custom field deleted successfully by uuid : ${uuid} \n`
          }
          return this.commonDbFn.delete( this.custom_fields, { uuid }, JSON.stringify( logMessages ) );
     }


}

