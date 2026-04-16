import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CdrsDocument, CdrsSchema } from "../../cdrs/schema/cdrs.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { MissedCallsDocument, MissedCallsSchema } from "./../schema/missed-calls.schema";

@Injectable()
export class MissedcallreportService {

     /*
     @Usage              : To load cdrs schema and other libraries
     @Param @InjectModel : It will load cdrs schema
     @Param commonDbFn   : To use commonly created mongoDB functions
     @return Object      : [cdrs,commonDbFn]
     */

     constructor(
          @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
          @InjectModel(MissedCallsSchema.name) private readonly missedCalls: Model<MissedCallsDocument>,
          private readonly commonDbFn: CommonDBFunctions,
          private readonly commonFn: CommonFunctions,
          @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
     ) { }

     private readonly getDispositionPathNames = async (
          dispositionModel: any, // mongoose model
          tenant_uuid: string,
          startDispositionUuid: string,
          options?: {
               maxDepth?: number;          // safety to prevent infinite loops
               stopOnEmptyParent?: boolean; // default true
          }
     ): Promise<string[]> => {
          const maxDepth = options?.maxDepth ?? 50;
          const stopOnEmptyParent = options?.stopOnEmptyParent ?? true;

          const namesChildToRoot: any = [];
          const visited = new Set<string>();

          let currentUuid: any = startDispositionUuid;

          for (let depth = 0; depth < maxDepth; depth++) {
               if (!currentUuid) break;
               if (visited.has(currentUuid)) break; // cycle protection
               visited.add(currentUuid);

               const doc = await dispositionModel
                    .findOne({ tenant_uuid, disposition_uuid: currentUuid })
                    .select({ name: 1, parent_disposition: 1 })
                    .lean();

               if (!doc) break;

               if (doc.name) namesChildToRoot.push(doc.name);

               const parent = doc.parent_disposition;

               // stop conditions
               if (stopOnEmptyParent && (parent === "" || parent == null)) break;

               currentUuid = parent;
          }

          // convert to ROOT -> ... -> CHILD
          return namesChildToRoot.reverse();
     }

     private formatCampaignDetails(item: any) {
          item.campaign_details = {
               outbound_campaign: item.outbound_campaign || [],
               inbound_campaign: item.inbound_campaign || [],
               blended_campaign: item.blended_campaign || [],
               campaign_uuid: item.campaign_uuid || null
          };

          // remove old keys
          delete item.outbound_campaign;
          delete item.inbound_campaign;
          delete item.blended_campaign;

          return item;
     }

     /*
     @Usage              : To search cdrs using advanced search
     @Param searchParams : Contains search paramaters
     @return Object      : Array of an object with total count of cdrs with data
     */

     async findAll(queryParams) {
          let populateFields = [{ path: "user", select: 'user_name username fullname' }, { path: 'ring_group', select: 'name' }, { path: 'call_queue', select: 'name' }, { path: 'ivr', select: 'name' }, { path: 'time_condition', select: 'name' }, { path: "outbound_campaign", select: "name" }, { path: "inbound_campaign", select: "name" }, { path: "blended_campaign", select: "name" }];
          let searchFields = ["callstart", "caller_id_number", "destination_number", "hangup_cause", "campaign_uuid"];

          const isRMQEnabled = String(process.env.RMQ_ENABLE).toLowerCase() === "true";
          let missedCallData;

          if (isRMQEnabled) {
               // Add callstate parameter for proper filtering
               queryParams.callstate = "missed";
               missedCallData = await this.commonDbFn.findAllWithPagination(this.missedCalls, queryParams, searchFields, populateFields);

               // Process campaign_details for each record
               missedCallData.data = missedCallData.data.map(doc => {
                    const item = doc.toObject ? doc.toObject() : doc;
                    return this.formatCampaignDetails(item);
               });

               return missedCallData;
          }

          // Build date-range filter from callstart / callend query params
          let where: any[] = [];
          let { role, tenant_uuid, uuid } = queryParams;

          //Filter only missed calls
          where.push({ call_state: "missed" });

          //Check Role type
          if (role == "tenant") {
               where.push({ tenant_uuid: tenant_uuid });
          } else if (role == "agent") {
               where.push({ user_uuid: uuid });
          }

          //Apply date range filter when callstart and callend are provided
          if (queryParams.callstart != undefined && queryParams.callend != undefined) {
               where.push({ "callstart": { "$gte": `${queryParams.callstart}`, "$lte": `${queryParams.callend}` } });
          }

          if (where.length == 0) { where = [{}]; }

          //Pagination
          const perPage = Number(queryParams.limit) || 10;
          const currentPage = Number(queryParams.page) || 1;
          const skip = perPage * (currentPage - 1);
          //End

          let result = await this.cdrs.find({ $and: where }).limit(perPage).skip(skip).sort({ _id: -1 }).populate(populateFields).exec();
          let count = 0;

          if (result.length > 0) {
               count = await this.cdrs.find({ $and: where }).count().exec();

               // Process hangup_cause for each record
               const processedData = await Promise.all(
                    result.map(async (doc) => {
                         const item: any = doc.toObject ? doc.toObject() : doc;

                         // Only process if hangup_cause exists and is not empty
                         if (item?.hangup_cause && item.hangup_cause.trim() !== "") {
                              const path = await this.getDispositionPathNames(
                                   this.disposition,
                                   tenant_uuid,
                                   item.hangup_cause,
                                   { maxDepth: 50 }
                              );

                              // path is ROOT -> ... -> CHILD
                              // Example for 3 levels: [super, parent, child]
                              const baseValue = path[0] ?? "-";
                              item.hangup_cause = baseValue;

                              // Fill hangup_cause_1, hangup_cause_2, ... up to (n-1)
                              for (let i = 1; i < Math.max(3, path.length); i++) {
                                   item[`hangup_cause_${i}`] = path[i] ?? "-";
                              }
                         } else {
                              // Set default values when hangup_cause is missing or empty
                              item.hangup_cause = "-";
                              item.hangup_cause_1 = "-";
                              item.hangup_cause_2 = "-";
                         }

                         return this.formatCampaignDetails(item);
                    })
               );

               return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, processedData, count);
          } else {
               return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count);
          }
     }

     async advancedSearch(searchParams) {
          let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where: any = [], key, obj, result, count = 0;

          //Check Role type
          where.push({ call_state: "missed" })
          let { role, tenant_uuid, uuid } = searchParams;
          if (role == "tenant") {
               where.push({ tenant_uuid: tenant_uuid });
          } else if (role == "agent") {
               where.push({ user_uuid: uuid });
          }
          //Delete unnecessary details from request
          // if (searchParams.role == "master_admin" || searchParams.role == "tenant" || searchParams.role == "agent") {
          delete searchParams.tenant_uuid;
          delete searchParams.role;
          delete searchParams.domain;
          delete searchParams.uuid;
          // }

          let populateFields = [{ path: "user", select: 'username fullname' }, { path: 'ring_group', select: 'name' }, { path: 'call_queue', select: 'name' }, { path: 'ivr', select: 'name' }, { path: 'time_condition', select: 'name' }, { path: "outbound_campaign", select: "name" }, { path: "inbound_campaign", select: "name" }, { path: "blended_campaign", select: "name" }];
          if (searchParams.callstart != undefined && searchParams.callend != undefined) {
               obj = { "callstart": { "$gte": `${searchParams.callstart}`, "$lte": `${searchParams.callend}` } };
               where.push(obj);
          }

          //Pagination
          const perPage = Number(searchParams.limit) || 10;
          const currentPage = Number(searchParams.page) || 1;
          const skip = perPage * (currentPage - 1);
          //End

          delete searchParams.callstart;
          delete searchParams.callend;

          objectKeys = Object.keys(searchParams);
          objectValues = Object.values(searchParams);
          len = objectKeys.length;

          /*if (len == 0) {
              return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
          }*/

          for (i = 0; i < len; i++) {
               filedName = objectKeys[i];
               filedValue = objectValues[i];
               if (filedName.includes("|")) {
                    key = filedName.split("|")[0].trim();
                    searchFlag = Number.parseInt(filedName.split("|")[1].trim());
               } else {
                    key = filedName;
                    searchFlag = -1;
               }

               switch (searchFlag) {
                    case 2: // Contains
                         obj = { [key]: { $regex: filedValue, $options: "i" } };
                         break;

                    case 3: // Does not contain
                         obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                         break;

                    case 4: // Equal
                         obj = { [key]: filedValue };
                         break;

                    case 5: // Not equal
                         obj = { [key]: { $ne: filedValue } };
                         break;

                    case 6: // Ends with
                         obj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                         break;

                    case 1:
                    default: // Begins with
                         obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                         break;
               }

               where.push(obj);
          }

          if (where.length == 0) { where = [{}]; }

          const isRMQEnabled = String(process.env.RMQ_ENABLE).toLowerCase() === "true";

          if (isRMQEnabled) {
               result = await this.missedCalls.find({ $and: where }).select('callstart caller_id_number destination_number user_uuid call_state pbx_feature pbx_feature_uuid createdAt hangup_cause campaign_uuid').limit(perPage).skip(skip).sort({ _id: -1 }).populate(populateFields).exec();

               if (result.length > 0) {
                    count = await this.missedCalls.find({ $and: where }).count().exec();
                    Logger.debug(count, "Search result count");

                    // Process campaign_details for each record
                    result = result.map((doc) => {
                         const data = typeof doc.toObject === 'function' ? doc.toObject() : doc;
                         return this.formatCampaignDetails(data);
                    });

                    return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
               } else {
                    Logger.error(count, "Search result count");
                    return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
               }
          } else {
               result = await this.cdrs.find({ $and: where }).select('callstart caller_id_number destination_number user_uuid call_state pbx_feature pbx_feature_uuid createdAt hangup_cause campaign_uuid').limit(perPage).skip(skip).sort({ _id: -1 }).populate(populateFields).exec();

               if (result.length > 0) {
                    count = await this.cdrs.find({ $and: where }).count().exec();
                    Logger.debug(count, "Search result count");

                    // Process hangup_cause for each record
                    result = await Promise.all(result?.map(async (doc) => {
                         const data = typeof doc.toObject === 'function' ? doc.toObject() : doc;

                         const path = await this.getDispositionPathNames(
                              this.disposition,
                              tenant_uuid,
                              data?.hangup_cause,
                              { maxDepth: 50 }
                         );

                         // path is ROOT -> ... -> CHILD
                         // Example for 3 levels: [super, parent, child]
                         const baseValue = path[0] ?? "-";
                         data.hangup_cause = baseValue;

                         // Fill hangup_cause_1, hangup_cause_2, ... up to (n-1)
                         for (let i = 1; i < Math.max(3, path.length); i++) {
                              data[`hangup_cause_${i}`] = path[i] ?? "-";
                         }

                         return this.formatCampaignDetails(data);
                    }));

                    return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
               } else {
                    Logger.error(count, "Search result count");
                    return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
               }
          }
     }
}