import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CampaignReportDocument, CampaignReportSchema } from "../schema/campaign-report.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import * as moment from 'moment-timezone';
import { AgentCampaignReportDocument, AgentCampaignReportSchema } from "src/modules/call-center/schema/agent-campaign-report.schema";
import { BlendedCampaignDocument, BlendedCampaignSchema } from 'src/modules/campaigns/blended-campaign/schema/blended-campaign.schema';
import { InboundCampaignDocument, InboundCampaignSchema } from 'src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema';
import { OutboundCampaignDocument, OutboundCampaignSchema } from 'src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema';
@Injectable()

export class CampaignReportService {

  public dropDispositionUUID;
  public saleDispositionUUID;

  /*
  @Usage : To load voicemail schema and other libraries
  @Param @InjectModel: It will load voicemail schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[voicemail,commonFn,commonDbFn]
  */


  constructor(
    @InjectModel(CampaignReportSchema.name) private readonly campaign_report: Model<CampaignReportDocument>,
    @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
    @InjectModel(DispositionSchema.name) private readonly disposition: Model<DispositionDocument>,
    @InjectModel(AgentCampaignReportSchema.name) private readonly agent_campaign_report: Model<AgentCampaignReportDocument>,
    @InjectModel(BlendedCampaignSchema.name) private readonly outboundModel: Model<BlendedCampaignDocument>,
    @InjectModel(InboundCampaignSchema.name) private readonly inboundModel: Model<InboundCampaignDocument>,
    @InjectModel(OutboundCampaignSchema.name) private readonly blendedModel: Model<OutboundCampaignDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of campaign report with data
  */

  async findAll(queryParams) {
    //let searchFields: any = ["campaign_name", "logged_in_agent", "lead_dialed", "answered_call", "drop_calls", "sale_count", "incoming_calls", "acd"];
    let searchFields = ["campaign_name"];
    let { callstart, callend, campaign_uuid, timezone, tenant_uuid, doQuery, page, limit, search } = queryParams;
    if (callstart != '' && callstart != undefined && callend != '' && callend != undefined) {

      /*let matchFileds = [],result,statusCode;
      
      callstart = moment.tz(callstart, timezone);
      callend = moment.tz(callend, timezone);

      matchFileds.push({ tenant_uuid }, { createdAt: { $gte: `${callstart.toDate()}`, $lte: `${callend.toDate()}` } });
      if(campaign_uuid != "" && campaign_uuid != undefined) matchFileds.push({campaign_uuid});
      result = await this.campaign_report.find({ $and: matchFileds }).exec();*/
      let matchFileds = [], result, statusCode, searchParams = [];
      if (doQuery != undefined) {
        result = await this.searchCampaign(queryParams);
      } else {
        const perPage = Number(limit) || 10;
        const currentPage = Number(page) || 1;
        const skip = perPage * (currentPage - 1);

        callstart = moment.tz(callstart, timezone);
        callend = moment.tz(callend, timezone);

        matchFileds.push({ tenant_uuid }, { createdAt: { $gte: `${callstart.toDate()}`, $lte: `${callend.toDate()}` } });
        if (campaign_uuid != "" && campaign_uuid != undefined) matchFileds.push({ campaign_uuid });

        //Add search parameters
        if (search != "" && search != undefined) {
          if (search != "" && search != undefined) {
            searchFields.map((data) => {
              searchParams.push({ [data]: { '$regex': search, '$options': 'i' } })
            });
            matchFileds.push({ '$or': searchParams });
            // query = { '$or': searchParams };
          }
        }
        result = await this.campaign_report.find({ $and: matchFileds }).limit(perPage).skip(skip).exec();
      }
      statusCode = result.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
      return this.commonDbFn.sendResponseWithMessage(statusCode, result);
    } else {
      return this.commonDbFn.findAllWithPagination(this.campaign_report, queryParams, searchFields);
    }
  }

  // async findAll(queryParams) {
  //   //let searchFields: any = ["campaign_name", "logged_in_agent", "lead_dialed", "answered_call", "drop_calls", "sale_count", "incoming_calls", "acd"];
  //   let searchFields = ["campaign_name"];
  //   let { callstart, callend, campaign_uuid, timezone, tenant_uuid, doQuery, page, limit, search } = queryParams;
  //   if (callstart != '' && callstart != undefined && callend != '' && callend != undefined) {

  //     /*let matchFileds = [],result,statusCode;

  //     callstart = moment.tz(callstart, timezone);
  //     callend = moment.tz(callend, timezone);

  //     matchFileds.push({ tenant_uuid }, { createdAt: { $gte: `${callstart.toDate()}`, $lte: `${callend.toDate()}` } });
  //     if(campaign_uuid != "" && campaign_uuid != undefined) matchFileds.push({campaign_uuid});
  //     result = await this.campaign_report.find({ $and: matchFileds }).exec();*/
  //     let matchFileds = [], result, statusCode, searchParams = [];
  //     if (doQuery === true || doQuery === 'true') {
  //       result = await this.searchCampaign(queryParams);
  //     } else {
  //       result = await this.searchCampaign(queryParams, true);
  //       // return
  //       // await this.searchCampaign(queryParams);
  //       // const perPage = Number(limit) || 10;
  //       // const currentPage = Number(page) || 1;
  //       // const skip = perPage * (currentPage - 1);

  //       // callstart = moment.tz(callstart, timezone);
  //       // callend = moment.tz(callend, timezone);

  //       // matchFileds.push({ tenant_uuid }, { createdAt: { $gte: `${callstart.toDate()}`, $lte: `${callend.toDate()}` } });
  //       // if (campaign_uuid != "" && campaign_uuid != undefined) matchFileds.push({ campaign_uuid });

  //       // //Add search parameters
  //       // if (search != "" && search != undefined) {
  //       //   if (queryParams.search != "" && queryParams.search != undefined) {
  //       //     searchFields.map((data) => {
  //       //       searchParams.push({ [data]: { '$regex': queryParams.search, '$options': 'i' } })
  //       //     });
  //       //     matchFileds.push({ '$or': searchParams });
  //       //     // query = { '$or': searchParams };
  //       //   }
  //       // }

  //       // result = await this.campaign_report.find({ $and: matchFileds }).limit(perPage).skip(skip).exec();
  //     }
  //     statusCode = result.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
  //     return this.commonDbFn.sendResponseWithMessage(statusCode, result);
  //   } else {
  //     return this.commonDbFn.findAllWithPagination(this.campaign_report, queryParams, searchFields);
  //   }
  // }

  /*
  @Usage              : To get records based on searched data
  @Param searchParams : Search parameters
  @return Object      : Array of an object with total count of campaign report with data
  */

  async searchCampaign(searchParams) {
    const { campaign_uuid, tenant_uuid } = searchParams;
    let allCampaigns = campaign_uuid.split(",");

    try {
      await this.campaign_report.deleteMany({ tenant_uuid });

      let finalResult = await this.searchCampaignreport(searchParams, allCampaigns);

      await this.campaign_report.insertMany(finalResult, { ordered: false });

      //Pagination
      const perPage = Number(searchParams.limit) || 10;
      const currentPage = Number(searchParams.page) || 1;
      const skip = perPage * (currentPage - 1);

      return await this.campaign_report.find({ tenant_uuid }).limit(perPage).skip(skip).exec();
    } catch (error) {
      Logger.error("Error in searchCampaign:", error.message);
      throw error;
    }
  }

  // async searchCampaign(searchParams) {
  //   const { campaign_uuid, tenant_uuid } = searchParams;

  //   let allCampaigns: string[] = [];

  //   // 1️⃣ Parse campaign_uuid if provided
  //   if (campaign_uuid && typeof campaign_uuid === 'string') {
  //     allCampaigns = campaign_uuid.split(',');
  //   }

  //   // 2️⃣ If fetching ALL campaigns dynamically
  //   if (allCampaigns.length === 0) {
  //     const [outbound, inbound, blended] = await Promise.all([
  //       this.outboundModel.find({ tenant_uuid }, { uuid: 1, _id: 0 }).lean(),
  //       this.inboundModel.find({ tenant_uuid }, { uuid: 1, _id: 0 }).lean(),
  //       this.blendedModel.find({ tenant_uuid }, { uuid: 1, _id: 0 }).lean(),
  //     ]);

  //     const campaigns = [...outbound, ...inbound, ...blended];
  //     allCampaigns = campaigns.map(c => String(c.uuid));
  //   }

  //   // 3️⃣ Clear old report data for tenant
  //   await this.campaign_report.deleteMany({ tenant_uuid });

  //   // 4️⃣ Generate new report data
  //   const finalResult = await this.searchCampaignreport(searchParams, allCampaigns);

  //   // 5️⃣ Insert new data
  //   if (finalResult?.length) {
  //     await this.campaign_report.insertMany(finalResult, { ordered: false });
  //   }

  //   // 6️⃣ Pagination
  //   const perPage = Number(searchParams.limit) || 10;
  //   const currentPage = Number(searchParams.page) || 1;
  //   const skip = perPage * (currentPage - 1);

  //   return this.campaign_report.find({ tenant_uuid }).limit(perPage).skip(skip).lean().exec();
  // }


  /*
  @Usage              : To filter records based on searched data
  @Param searchParams : Search parameters
  @Param insertedData : Data which inserted into campaign report
  @Param allCampaigns : Contains all campaign of tenant
  @return Object      : Array of an object with total count of campaign report with data
  */

  async searchCampaignreport(searchParams, allCampaigns) {

    let { tenant_uuid, timezone, callstart, callend } = searchParams;
    callstart = moment.tz(callstart, timezone);
    callend = moment.tz(callend, timezone);

    //Fetch total logged in agent based on search parameter
    let getAggentLoggedIn = await this.getAggentLoggedIn(tenant_uuid, callstart, callend, allCampaigns);

    //Fetch cdrs required data based on search parameter
    let getCdrsDetails = await this.getLeadDialed(tenant_uuid, callstart, callend, allCampaigns);
    const mergedArray = [...getAggentLoggedIn, ...getCdrsDetails];
    let finalResult = await this.getFinalDataForCampaignReport(mergedArray, "campaign_uuid");
    return finalResult;
  }

  /*
  @Usage              : To get logged in agent based on searched data
  @Param tenant_uuid  : uuid of tenant
  @Param callstart    : Start date of search
  @Param callend      : End date of search
  @Param allCampaigns : Contains all campaign of tenant
  @return Object      : Array of an object with total count of logged in agent
  */

  async getAggentLoggedIn(tenant_uuid, callstart, callend, allCampaigns) {

    //Variable declaration
    let finalArr = [], campaign_name, outboundCampaign, inboundCampaign, blendedCampaign;
    try {
      let agentCampaignReportDetails = await this.agent_campaign_report.aggregate([
        { $match: { tenant_uuid, campaign_uuid: { $in: allCampaigns }, login_status: "0", createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() } } },
        {
          $lookup: { from: "outbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "outbound_campaign" }
        },
        {
          $lookup: { from: "inbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "inbound_campaign" }
        },
        {
          $lookup: { from: "blended_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "blended_campaign" }
        },
        { $sort: { _id: -1 } },
        {
          $group: {
            _id: {
              campaign_uuid: "$campaign_uuid",
              agent_uuid: "$agent_uuid"
            },
            "outbound_campaign_details": { "$first": "$outbound_campaign.name" },
            "inbound_campaign_details": { "$first": "$inbound_campaign.name" },
            "blended_campaign_details": { "$first": "$blended_campaign.name" },
            loginStatusSet: { $addToSet: '$login_status' },
          }
        },
        {
          $group: {
            _id: '$_id.campaign_uuid',
            loginStatusSet: { $addToSet: { agent_uuid: '$_id.agent_uuid', login_status: 0 } },
            "outbound_campaign_details": { "$first": "$outbound_campaign_details" },
            "inbound_campaign_details": { "$first": "$inbound_campaign_details" },
            "blended_campaign_details": { "$first": "$blended_campaign_details" },
          },
        }
      ]).exec();


      if (agentCampaignReportDetails.length > 0) {
        agentCampaignReportDetails.map((data) => {
          outboundCampaign = data?.outbound_campaign_details;
          inboundCampaign = data?.inbound_campaign_details;
          blendedCampaign = data?.blended_campaign_details;

          if (outboundCampaign?.length > 0 || inboundCampaign?.length > 0 || blendedCampaign?.length > 0) {
            campaign_name = outboundCampaign?.length > 0 ? outboundCampaign[0] : (inboundCampaign?.length > 0 ? inboundCampaign[0] : blendedCampaign[0]);
            finalArr.push({ campaign_name, logged_in_agent: data?.loginStatusSet?.length, campaign_uuid: data._id, tenant_uuid });
          }
        });

      }
    } catch (error) {
      Logger.error(`Error in catch block ==> searchCampaignreport()`, error.message);
    }
    return finalArr;
  }

  /*
  @Usage              : To get data from cdrs based on searched data
  @Param tenant_uuid  : uuid of tenant
  @Param callstart    : Start date of search
  @Param callend      : End date of search
  @Param allCampaigns : Contains all campaign of tenant
  @return Object      : Array of an object with details of cdrs
  */

  async getLeadDialed(tenant_uuid, callstart, callend, allCampaigns) {
    try {
      // if (this.dropDispositionUUID == undefined && this.saleDispositionUUID == undefined) {

      //   let dispositionDetails = await this.disposition.find({ code: { $in: ["SALE", "DROP"] } });
      //   let dropDispositionUUID = dispositionDetails.filter(item => item.code == "DROP");
      //   this.dropDispositionUUID = dropDispositionUUID[0].disposition_uuid;
      //   let saleDispositionUUID = dispositionDetails.filter(item => item.code == "SALE");
      //   this.saleDispositionUUID = saleDispositionUUID[0].disposition_uuid;
      // }

      // ✅ ENSURE DISPOSITION UUIDS EXIST (SAFE FETCH)
      let dropUUID = this.dropDispositionUUID;
      let saleUUID = this.saleDispositionUUID;

      if (!dropUUID || !saleUUID) {
        const dispositionDetails = await this.disposition.find({
          code: { $in: ["SALE", "DROP"] }
        }).lean();

        dropUUID = dispositionDetails.find(d => d.code === "DROP")?.disposition_uuid ?? null;
        saleUUID = dispositionDetails.find(d => d.code === "SALE")?.disposition_uuid ?? null;

        this.dropDispositionUUID = dropUUID;
        this.saleDispositionUUID = saleUUID;
      }

      const result = await this.cdrs.aggregate([
        { $match: { tenant_uuid, campaign_uuid: { $in: allCampaigns }, createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() } } },
        { $lookup: { from: "outbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "outbound_campaign" } },
        { $lookup: { from: "inbound_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "inbound_campaign" } },
        { $lookup: { from: "blended_campaign", localField: "campaign_uuid", foreignField: "uuid", as: "blended_campaign" } },
        { $lookup: { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user_details" } },
        {
          $group: {
            _id: { campaign_uuid: "$campaign_uuid", agent_uuid: "$user_uuid" },
            outbound_campaign: { $first: { $first: "$outbound_campaign.name" } },
            inbound_campaign: { $first: { $first: "$inbound_campaign.name" } },
            blended_campaign: { $first: { $first: "$blended_campaign.name" } },
            fullname: { $first: { $first: "$user_details.fullname" } },
            createdAt: { $first: "$createdAt" },
            leadDialed: { $sum: { $cond: [{ $ne: ['$lead_uuid', ""] }, 1, 0] } },
            answeredCalls: { $sum: { $cond: [{ $gt: ['$billsecond', 0] }, 1, 0] } },
            dropCalls: { $sum: { $cond: [dropUUID ? { $eq: ['$hangup_cause', dropUUID] } : false, 1, 0] } },
            saleCount: { $sum: { $cond: [saleUUID ? { $eq: ['$hangup_cause', saleUUID] } : false, 1, 0] } },
            incomingCalls: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
            totalBillsecond: { $sum: { $cond: [{ $gt: ['$billsecond', 0] }, "$billsecond", 0] } }
          }
        },
        {
          $group: {
            _id: "$_id.campaign_uuid",
            outbound_campaign: { $first: "$outbound_campaign" },
            inbound_campaign: { $first: "$inbound_campaign" },
            blended_campaign: { $first: "$blended_campaign" },
            agents: {
              $push: {
                agent_uuid: "$_id.agent_uuid",
                fullname: "$fullname",
                lead_dialed: "$leadDialed",
                answered_call: "$answeredCalls",
                drop_calls: "$dropCalls",
                sale_count: "$saleCount",
                incoming_calls: "$incomingCalls",
                totalBillsecond: "$totalBillsecond",
                createdAt: "$createdAt"
              }
            },
            totalLeadDialed: { $sum: "$leadDialed" },
            totalAnsweredCalls: { $sum: "$answeredCalls" },
            totalDropCalls: { $sum: "$dropCalls" },
            totalSaleCount: { $sum: "$saleCount" },
            totalIncomingCalls: { $sum: "$incomingCalls" },
            totalBillsecond: { $sum: "$totalBillsecond" }
          }
        }
      ]).exec();

      // 🔥 PURE TRANSFORMATION
      return result.map((data: any) => {
        const acdSeconds = Math.round((data?.totalBillsecond / data?.totalAnsweredCalls)) || 0;
        const acdTime =
          data?.totalAnsweredCalls > 0
            ? moment.utc(acdSeconds * 1000).format("HH:mm:ss")
            : "00:00:00";

        return {
          lead_dialed: data?.totalLeadDialed,
          campaign_uuid: data?._id,
          answered_call: data?.totalAnsweredCalls,
          drop_calls: data?.totalDropCalls,
          sale_count: data?.totalSaleCount,
          incoming_calls: data?.totalIncomingCalls,
          acd: acdTime,
          tenant_uuid,
          campaign_name:
            data.outbound_campaign ||
            data.inbound_campaign ||
            data.blended_campaign ||
            "",
          agents: (data?.agents || []).map((agent: any) => {
            const agentAcdSeconds = Math.round((agent?.totalBillsecond / agent?.answered_call)) || 0;

            return {
              agent_uuid: agent?.agent_uuid,
              fullname: agent?.fullname,
              lead_dialed: agent?.lead_dialed,
              answered_call: agent?.answered_call,
              drop_calls: agent?.drop_calls,
              sale_count: agent?.sale_count,
              incoming_calls: agent?.incoming_calls,
              acd:
                agent?.answered_call > 0
                  ? moment.utc(agentAcdSeconds * 1000).format("HH:mm:ss")
                  : "00:00:00",
              report_date: agent?.createdAt
                ? moment(agent.createdAt).format("YYYY-MM-DD")
                : moment().format("YYYY-MM-DD")
            };
          })
        };
      });

    } catch (error) {
      Logger.error(`Error in catch block ==> getLeadDialed()`, error.message);
      return [];
    }
  }

  /*
  @Usage              : To get data from cdrs based on searched data
  @Param mergedArray  : Arrays need to be merged
  @Param key          : Unique filter key
  @return Object      : Array of an object with details of cdrs
  */

  async getFinalDataForCampaignReport(mergedArray, key) {
    return Object.values(
      mergedArray.reduce((acc: any, obj: any) => {
        const campaignUuid = obj[key];
        const groupKey = campaignUuid;

        if (acc[groupKey] === undefined) {
          acc[groupKey] = {
            campaign_uuid: campaignUuid,
            campaign_name: obj.campaign_name,
            tenant_uuid: obj.tenant_uuid,
            logged_in_agent: obj.logged_in_agent || 0,
            lead_dialed: obj.lead_dialed || 0,
            answered_call: obj.answered_call || 0,
            drop_calls: obj.drop_calls || 0,
            sale_count: obj.sale_count || 0,
            incoming_calls: obj.incoming_calls || 0,
            acd: obj.acd || "00:00:00",
            agents: obj.agents || []
          };
        } else {
          if (obj.agents && obj.agents.length > 0) {
            obj.agents.forEach((agent: any) => {
              const existing = acc[groupKey].agents.find(
                (a: any) => a.agent_uuid === agent.agent_uuid
              );

              if (existing) {
                existing.lead_dialed += agent.lead_dialed || 0;
                existing.answered_call += agent.answered_call || 0;
                existing.drop_calls += agent.drop_calls || 0;
                existing.sale_count += agent.sale_count || 0;
                existing.incoming_calls += agent.incoming_calls || 0;
              } else {
                acc[groupKey].agents.push(agent);
              }
            });
          }

          acc[groupKey].logged_in_agent = Math.max(
            acc[groupKey].logged_in_agent,
            obj.logged_in_agent || 0
          );
          acc[groupKey].lead_dialed += obj.lead_dialed || 0;
          acc[groupKey].answered_call += obj.answered_call || 0;
          acc[groupKey].drop_calls += obj.drop_calls || 0;
          acc[groupKey].sale_count += obj.sale_count || 0;
          acc[groupKey].incoming_calls += obj.incoming_calls || 0;

          if (obj.acd && obj.acd !== "00:00:00") {
            acc[groupKey].acd = obj.acd;
          }
        }

        if (acc[groupKey].report_date === undefined && acc[groupKey].agents?.length > 0) {
          acc[groupKey].report_date = acc[groupKey].agents[0].report_date;
        }

        return acc;
      }, {})
    );
  }
}
