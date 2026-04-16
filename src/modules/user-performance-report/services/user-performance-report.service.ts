import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import * as moment from 'moment-timezone';
import { UserPerformanceReportDocument, UserPerformanceReportSchema } from "../schema/user-performance-report.schema";
import { CdrsSummaryDocument, CdrsSummarySchema } from "src/modules/cdrs/schema/cdrs-summary.schema";
import { AgentLoginLogoutDocument, AgentLoginLogoutSchema } from "src/modules/call-center/schema/agent-login-logout.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { IdleStateAgentDocument, IdleStateAgentSchema } from "src/modules/call-center/schema/idle-state-agent.schema";
import { BreakcodeDocument, BreakcodeSchema } from "src/modules/breakcode/schema/breakcode.schema";
//import { AcwAgentDocument, AcwAgentSchema } from "src/modules/call-center/schema/acw-agent.schema";


@Injectable()
export class UserPerformanceReportService {

  /*
  @Usage              : To load user performance report schema and other libraries
  @Param @InjectModel : It will load user performance report schema
  @Param commonDbFn   : To use commonly created mongoDB functions
  @return Object      : [user performance report,commonDbFn]
  */

  constructor(
    private readonly commonDbFn: CommonDBFunctions,
    @InjectModel(UserPerformanceReportSchema.name) private readonly user_performance_report: Model<UserPerformanceReportDocument>,
    @InjectModel(CdrsSummarySchema.name) private readonly cdrs_summary: Model<CdrsSummaryDocument>,
    @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
    @InjectModel(AgentLoginLogoutSchema.name) private readonly agent_login_logout_report: Model<AgentLoginLogoutDocument>,
    @InjectModel(IdleStateAgentSchema.name) private readonly idle_state_agent: Model<IdleStateAgentDocument>,
    @InjectModel(BreakcodeSchema.name) private readonly breakcode: Model<BreakcodeDocument>,
    //@InjectModel(AcwAgentSchema.name) private readonly acw_agent: Model<AcwAgentDocument>,
  ) { }

  private getDateWiseRange(startdate, enddate, timezone) {
    const start = moment.tz(startdate, timezone).startOf("day");
    const end = moment.tz(enddate, timezone).endOf("day");

    const dates: { dayStart: any; dayEnd: any; label: string }[] = [];

    let cursor = start.clone();

    while (cursor.isSameOrBefore(end, "day")) {
      dates.push({
        dayStart: cursor.clone().startOf("day"),
        dayEnd: cursor.clone().endOf("day"),
        label: cursor.format("YYYY-MM-DD"),
      });
      cursor.add(1, "day");
    }

    return dates;
  }

  /**
   * Calculate total session time (from first login to last logout)
   * This calculates the SPAN of time from login to logout (includes break time)
   */
  async get_total_session_time(alldata, dayEnd) {
    if (alldata.length === 0) return [];

    let sessions = [];
    let sessionStart = null;
    let inSession = false;
    let dayEndDate = new Date(dayEnd);

    for (let i = 0; i < alldata.length; i++) {
      let entry = alldata[i];

      // Login (status=0) - start of session or return from break
      if (entry.login_status == 0 && (entry.breakcode_uuid == "" || entry.breakcode_uuid == undefined)) {
        // if (entry.login_status == 0) {
        // Only set sessionStart if we're not already in a session
        if (!inSession) {
          sessionStart = entry.date;
          inSession = true;
        }
        // If we're already in session, this is just returning from break
        // Don't reset sessionStart - the session continues
      }
      // Logout (status=2) - end of session
      else if (entry.login_status == 2) {
        if (inSession && sessionStart) {
          let duration = this.calculateHours(sessionStart, entry.date);
          if (duration > 0) {
            sessions.push({ start: sessionStart, end: entry.date, duration });
          }
          sessionStart = null;
          inSession = false;
        }
      }
    }

    // Handle case where agent is still logged in (no logout entry)
    // This shouldn't happen in your data, but good to handle
    if (inSession && sessionStart) {
      // Bound the session by dayEnd (which is either 23:59:59 or NOW)
      let boundEnd = new Date(sessionStart) > dayEndDate ? sessionStart : dayEndDate;
      let duration = this.calculateHours(sessionStart, boundEnd);
      if (duration > 0) {
        sessions.push({ start: sessionStart, end: boundEnd, duration });
      }
    }

    return sessions;
  }

  /**
   * Calculate ALL break hours (both billable and non-billable)
   */
  async get_all_breakhours(alldata, dayEnd) {
    let effectiveHours = [];
    let dayEndDate = new Date(dayEnd);

    for (let i = 0; i < alldata.length; i++) {
      let currentEntry = alldata[i];
      let nextEntry = alldata[i + 1];

      if (currentEntry.login_status == 1 && currentEntry.breakcode_uuid) {
        let breakEnd = (nextEntry && (nextEntry.login_status == 0 || nextEntry.login_status == 2)) 
          ? nextEntry.date 
          : dayEndDate;
        
        let calculateHours = this.calculateHours(currentEntry.date, breakEnd);
        if (calculateHours > 0) {
          effectiveHours.push(calculateHours);
        }
      }
    }

    return effectiveHours.reduce((acc, val) => acc + val, 0);
  }

  /**
   * Calculate ONLY non-billable break hours (where billable = "1")
   * @param breakCodeMap Pre-fetched map of breakcode UUID -> billable flag (avoids per-call DB query)
   */
  async get_non_billable_breakhours(alldata, dayEnd, breakCodeMap: Record<string, string> = {}) {
    let effectiveHours = [];
    let dayEndDate = new Date(dayEnd);
    // let breakentries = alldata.filter(entry => entry.breakcode_uuid);

    // if (breakentries.length === 0) return 0;

    // // Fetch break codes to check billable status
    // let breakCodeUuids = breakentries.map(entry => entry.breakcode_uuid).filter(Boolean);
    // let uniqueBreakCodeUuids = [...new Set(breakCodeUuids)];

    // let breakCodes = await this.breakcode.find({
    //   uuid: { $in: uniqueBreakCodeUuids }
    // }).lean();

    // // Create a map for quick lookup
    // let breakCodeMap = {};
    // breakCodes.forEach((bc: any) => {
    //   breakCodeMap[bc.uuid] = bc.billable;
    // });

    for (let j = 0; j < alldata.length; j++) {
      let currentEntry = alldata[j];
      let nextEntry = alldata[j + 1];

      if (currentEntry.login_status == 1 && currentEntry.breakcode_uuid) {
        if (breakCodeMap[currentEntry.breakcode_uuid] === "1") {
          let breakEnd = (nextEntry && (nextEntry.login_status == 0 || nextEntry.login_status == 2)) 
            ? nextEntry.date 
            : dayEndDate;

          let calculateHours = this.calculateHours(currentEntry.date, breakEnd);
          if (calculateHours > 0) {
            effectiveHours.push(calculateHours);
          }
        }
      }
    }

    return effectiveHours.reduce((acc, val) => acc + val, 0);
  }

  /**
   * Calculate break bifurcation (break names and their durations)
   */
  async get_break_details(alldata, dayEnd) {
    let breakMap = {};
    let dayEndDate = new Date(dayEnd);

    for (let i = 0; i < alldata.length; i++) {
      let currentEntry = alldata[i];
      let nextEntry = alldata[i + 1];

      if (currentEntry.login_status == 1 && currentEntry.breakcode_uuid) {
        let breakEnd = (nextEntry && (nextEntry.login_status == 0 || nextEntry.login_status == 2)) 
          ? nextEntry.date 
          : dayEndDate;

        let durationMs = this.calculateHours(currentEntry.date, breakEnd);
        if (durationMs > 0) {
          let breakName = currentEntry.breakcode?.name || "Other Break";
          if (!breakMap[breakName]) {
            breakMap[breakName] = 0;
          }
          breakMap[breakName] += durationMs;
        }
      }
    }

    // Convert durations to formatted time strings
    let result = {};
    for (let breakName in breakMap) {
      result[breakName] = this.getTimeInHoursAndMinutes(breakMap[breakName]);
    }

    return result;
  }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of campaign report with data
  */

  async findAll(queryParams: any) {
    if (queryParams.user_uuid) {
      queryParams.user_uuid = Array.isArray(queryParams.user_uuid)
        ? queryParams.user_uuid
        : queryParams.user_uuid
          .split(',')
          .map((uuid: string) => uuid.trim())
          .filter(Boolean); // removes empty strings
    }

    let searchFields = ["username"];
    return this.commonDbFn.findAllWithPagination(this.user_performance_report, queryParams, searchFields);
  }

  /*
  @Usage              : To get report of user's
  @return Object      : [user performance report,commonDbFn]
  */

  async getUserPerfomanceWiseReport(searchedData) {
    const { tenant_uuid, user_uuid, page, limit } = searchedData;
    let allUsers = user_uuid?.split(",");

    // Early return if no users provided
    if (!allUsers || allUsers.length === 0) {
      return this.commonDbFn.sendResponseWithCount(HttpStatus.BAD_REQUEST, [], 0);
    }

    // await this.user_performance_report.deleteMany({ tenant_uuid });
    // let result = await this.getReportData(searchedData, allUsers);

    // 🔹 Run deleteMany and data fetch in parallel to eliminate sequential wait
    const [_, result] = await Promise.all([
      this.user_performance_report.deleteMany({ tenant_uuid }),
      this.getReportData(searchedData, allUsers),
    ]);

    // Early return if no report data
    if (!result || result.length === 0) {
      return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, [], 0);
    }

    //Insert data into DB
    await this.user_performance_report.insertMany(result, { ordered: false });

    //Fetch data with pagination and count in parallel
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const skip = perPage * (currentPage - 1);

    // Execute find and countDocuments in parallel for better performance
    const [paginatedResult, totalCount] = await Promise.all([
      this.user_performance_report.find({ tenant_uuid }).limit(perPage).skip(skip).lean().exec(),
      this.user_performance_report.countDocuments({ tenant_uuid })
    ]);

    let statusCode = paginatedResult.length ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return this.commonDbFn.sendResponseWithCount(statusCode, paginatedResult, totalCount);
  }

  /*
  @Usage              : To get report of user's
  @Param searchedData : It will contain page(default=1),limit(default=10),search
  @Param allUsers     : all searched user list
  @return             : Array of an object with user perfomance report details
  */

  /*async getReportData(searchedData, allUsers) {
    let { tenant_uuid, timezone, callstart, callend } = searchedData;
    callstart = moment.tz(callstart, timezone);
    callend = moment.tz(callend, timezone);

    //Fetch call's data by user
    let getUsersCallData = await this.fetchDataFromCdrsSummary(tenant_uuid, callstart, callend, allUsers);

    //Get agent's login/break entires
    let getAgentHistory = await this.getAgentHistory(tenant_uuid, callstart, callend, allUsers, timezone);

    //Calculate Idle & ACW
    let getAgentIdleACWHistory = await this.getIdleAndACWTime(tenant_uuid, callstart, callend, allUsers, timezone);

    //Merge calls and agent data
    let result = await this.mergeCallsAndAgentData(getUsersCallData, getAgentHistory);

    //Merge Idle history with ==> call and agent data
    result = await this.mergeCallsAgentAndIdleData(result, getAgentIdleACWHistory);

    return result;
  }*/

  // async getReportData(searchedData, allUsers) {
  //   // let { tenant_uuid, timezone, callstart, callend } = searchedData;
  //   let { tenant_uuid, timezone, startdate, enddate } = searchedData;
  //   startdate = moment.tz(startdate, timezone);
  //   enddate = moment.tz(enddate, timezone);

  //   //Fetch call's data by user
  //   let getUsersCallData = await this.fetchDataFromCdrsSummary(tenant_uuid, startdate, enddate, allUsers);

  //   //Get agent's login/break entires
  //   let getAgentHistory = await this.getAgentHistory(tenant_uuid, startdate, enddate, allUsers, timezone);

  //   //Calculate Idle & ACW
  //   let getAgentIdleACWHistory = await this.getIdleAndACWTime(tenant_uuid, startdate, enddate, allUsers, timezone);

  //   //Merge calls and agent data
  //   let result = await this.mergeCallsAndAgentData(getUsersCallData, getAgentHistory);

  //   //Merge Idle history with ==> call and agent data
  //   result = await this.mergeCallsAgentAndIdleData(result, getAgentIdleACWHistory);

  //   return result;
  // }

  async getReportData(searchedData, allUsers) {
    let { tenant_uuid, timezone, startdate, enddate, direction, campaign_uuid } = searchedData;

    // const dateRanges = this.getDateWiseRange(startdate, enddate, timezone);

    // // 🔹 PROCESS ALL DAYS IN PARALLEL FOR MAXIMUM PERFORMANCE
    // const dayResults = await Promise.all(
    //   dateRanges.map(async (day) => {
    //     // 🔹 FETCH ALL DATA FOR THIS DAY IN PARALLEL
    //     const [getUsersCallData, getAgentHistory, getAgentIdleACWHistory] = await Promise.all([
    //       this.fetchDataFromCdrsSummary(tenant_uuid, day.dayStart, day.dayEnd, allUsers),
    //       this.getAgentHistory(tenant_uuid, day.dayStart, day.dayEnd, allUsers, timezone),
    //       this.getIdleAndACWTime(tenant_uuid, day.dayStart, day.dayEnd, allUsers, timezone)
    //     ]);

    //     // Merge data
    //     let result = this.mergeCallsAndAgentData(getUsersCallData, getAgentHistory);
    //     result = this.mergeCallsAgentAndIdleData(result, getAgentIdleACWHistory);
    //     result = result.map((r) => ({ ...r, report_date: day.label }));
    //     return result;
    //   })
    // );

    // // Flatten results
    // return dayResults.flat();

    // 🔹 SINGLE WIDE QUERY FOR THE FULL DATE RANGE — 3 queries total instead of N×3 per day.
    // Aggregations already group by (user_uuid, report_date), so data is naturally day-segmented.
    const rangeStart = moment.tz(startdate, timezone).startOf('day');
    const rangeEnd   = moment.tz(enddate, timezone).endOf('day');

    const [getUsersCallData, getAgentHistory, getAgentIdleACWHistory] = await Promise.all([
      this.fetchDataFromCdrsSummary(tenant_uuid, rangeStart, rangeEnd, allUsers, direction, campaign_uuid),
      this.getAgentHistory(tenant_uuid, rangeStart, rangeEnd, allUsers, timezone),
      this.getIdleAndACWTime(tenant_uuid, rangeStart, rangeEnd, allUsers, timezone),
    ]);

    // Merge data
    let result = this.mergeCallsAndAgentData(getUsersCallData, getAgentHistory);
    result = this.mergeCallsAgentAndIdleData(result, getAgentIdleACWHistory);
    return result;
  }

  /*
  @Usage              : To get calls data of user's
  @Param tenant_uuid  : uuid of tenant
  @Param callstart    : start date of search
  @Param callend      : end date of search
  @Param allUsers     : all searched user list
  @return             : Array of an object with call details of user's
  */

  async fetchDataFromCdrsSummary(tenant_uuid, callstart, callend, allUsers, direction?, campaign_uuid?) {
    //Variable declaration
    let finalArr = [];
    try {
      //createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() }
      let matchCdrs: any = { tenant_uuid, user_uuid: { $in: allUsers }, createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() } };
      let matchCdrsSummary: any = { tenant_uuid, user_uuid: { $in: allUsers }, createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() } };

      if (direction) {
        matchCdrs.direction = { $regex: new RegExp(`^${direction}$`, 'i') };
        matchCdrsSummary.direction = { $regex: new RegExp(`^${direction}$`, 'i') };
      }

      if (campaign_uuid && campaign_uuid.length > 0) {
        const camps = Array.isArray(campaign_uuid) ? campaign_uuid : campaign_uuid.split(',');
        matchCdrs.campaign_uuid = { $in: camps };
      }

      // 🔹 RUN ALL AGGREGATIONS AND QUERIES IN PARALLEL FOR MAXIMUM PERFORMANCE
      const [cdrsSummaryDetails, cdrsAggregateDetails, csatAgg] = await Promise.all([
        this.cdrs_summary.aggregate([
          { $match: matchCdrsSummary },
          {
            $lookup: { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user" }
          },
          { $sort: { _id: -1 } },
          {
            $addFields: {
              report_date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
              }
            }
          },
          {
            $group: {
              // _id: "$user_uuid",
              _id: {
                user_uuid: "$user_uuid",
                report_date: "$report_date"
              },
              success: { $sum: "$success" },
              acd: { $sum: "$billsecond" },
              username: { "$first": "$user.username" },
              fullname: { "$first": "$user.fullname" },
              totalInboundCalls: {
                $sum: {
                  $cond: {
                    if: { $eq: [{ $toLower: "$direction" }, "inbound"] },
                    then: 1,
                    else: 0,
                  },
                },
              },
              totalOutboundCalls: {
                $sum: {
                  $cond: {
                    if: { $eq: [{ $toLower: "$direction" }, "outbound"] },
                    then: 1,
                    else: 0,
                  },
                },
              },
              answeredCalls: {
                $sum: {
                  $cond: {
                    if: { $gt: ['$billsecond', 0] },
                    then: 1,
                    else: 0,
                  },
                },
              },
              totalBillseconds: {
                $sum: {
                  $cond: {
                    if: { $gt: ['$billsecond', 0] },
                    then: "$billsecond",
                    else: 0,
                  },
                },
              },
            }
          }
        ]).exec(),

        // if (cdrsSummaryDetails.length) {
        //   cdrsSummaryDetails.map((data) => {
        //     finalArr.push({
        //       user_uuid: data._id,
        //       username: data.username[0],
        //       inbound_call_count: data.totalInboundCalls,
        //       outbound_call_count: data.totalOutboundCalls,
        //       acd: this.calculateAcd(data.acd, data.success),
        //       talk_time: this.calculateAcd("", "", data.totalBillseconds,true),
        //       tenant_uuid
        //     })
        //   });
        //   return finalArr;
        // }
        this.cdrs.aggregate([
          { $match: matchCdrs },
          { $lookup: { from: "user", localField: "user_uuid", foreignField: "uuid", as: "user_info" } },
          { $unwind: "$user_info" },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: {
                user_uuid: "$user_uuid",
                report_date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                }
              },
              success: { $sum: "$success" },
              acd: { $sum: "$billsecond" },
              username: { $first: "$user_info.username" },
              fullname: { $first: "$user_info.fullname" },
              totalCalls: { $sum: 1 },
              successfulCalls: { $sum: { $cond: [{ $eq: ["$disposition", "ANSWERED"] }, 1, 0] } },
              totalBillseconds: { $sum: "$billsecond" },
              totalInboundCalls: { $sum: { $cond: { if: { $eq: [{ $toLower: "$direction" }, "inbound"] }, then: 1, else: 0 } } },
              totalOutboundCalls: { $sum: { $cond: { if: { $eq: [{ $toLower: "$direction" }, "outbound"] }, then: 1, else: 0 } } },
              answeredCalls: { $sum: { $cond: { if: { $gt: ["$billsecond", 0] }, then: 1, else: 0 } } },
              totalRingingTime: { $sum: "$ringing_time" },
              totalHoldTime: { $sum: "$hold_time" },
              totalWaitingTime: { $sum: "$waiting_time" },
              totalDuration: { $sum: "$total_duration" },
              totalBillsecondsFromCdrs: { $sum: { $convert: { input: "$billsecond", to: "double", onError: 0, onNull: 0 } } },
              disconnectedByAgent: { $sum: { $cond: [{ $in: ["$disconnected_by", [0, "0"]] }, 1, 0] } },
            }
          },
          {
            $project: {
              _id: 1, username: 1, fullname: 1, totalCalls: 1, successfulCalls: 1, totalBillseconds: 1, totalInboundCalls: 1, totalOutboundCalls: 1, answeredCalls: 1, totalRingingTime: 1, totalHoldTime: 1, totalWaitingTime: 1, totalDuration: 1, disconnectedByAgent: 1,
              avgRingingTime: { $cond: [{ $eq: ["$answeredCalls", 0] }, 0, { $divide: ["$totalRingingTime", "$answeredCalls"] }] },
              avgHoldTime: { $cond: [{ $eq: ["$answeredCalls", 0] }, 0, { $divide: ["$totalHoldTime", "$answeredCalls"] }] },
              avgWaitingTime: { $cond: [{ $eq: ["$answeredCalls", 0] }, 0, { $divide: ["$totalWaitingTime", "$answeredCalls"] }] },
              avgTalkTime: { $cond: [{ $eq: ["$answeredCalls", 0] }, 0, { $divide: [{ $subtract: ["$totalDuration", { $add: ["$totalHoldTime", "$totalWaitingTime", "$totalRingingTime"] }] }, "$answeredCalls"] }] }
            }
          }
        ]
        ).exec(),
        // csat agrregation
        // ✅ CSAT aggregate per agent (0-9 and N/A)
        this.cdrs.aggregate([
          {
            $match: matchCdrs,
          },

          // ✅ normalize score
          {
            $addFields: {
              csat_trim: {
                $trim: { input: { $toString: "$ivr_feedback_score" } },
              },
            },
          },

          // ✅ allow only: 0-9 or N/A
          {
            $match: {
              csat_trim: { $in: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "N/A"] },
            },
          },

          // ✅ numeric conversion (N/A becomes null)
          {
            $addFields: {
              csat_number: {
                $convert: {
                  input: "$csat_trim",
                  to: "int",
                  onError: null,
                  onNull: null,
                },
              },
              isNA: { $cond: [{ $eq: ["$csat_trim", "N/A"] }, 1, 0] },
              isRated: { $cond: [{ $ne: ["$csat_trim", "N/A"] }, 1, 0] },
            },
          },

          // ✅ group agent wise
          {
            $group: {
              // _id: "$user_uuid",
              _id: {
                user_uuid: "$user_uuid",
                report_date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                }
              },

              // ✅ Total calls INCLUDING N/A
              csat_total_calls: { $sum: 1 },

              csat_na_calls: { $sum: "$isNA" },
              csat_rated_calls: { $sum: "$isRated" },

              // ✅ Sum of numeric scores (N/A gives 0)
              csat_score_sum: { $sum: { $ifNull: ["$csat_number", 0] } },

              // ✅ distribution
              csat_0: { $sum: { $cond: [{ $eq: ["$csat_number", 0] }, 1, 0] } },
              csat_1: { $sum: { $cond: [{ $eq: ["$csat_number", 1] }, 1, 0] } },
              csat_2: { $sum: { $cond: [{ $eq: ["$csat_number", 2] }, 1, 0] } },
              csat_3: { $sum: { $cond: [{ $eq: ["$csat_number", 3] }, 1, 0] } },
              csat_4: { $sum: { $cond: [{ $eq: ["$csat_number", 4] }, 1, 0] } },
              csat_5: { $sum: { $cond: [{ $eq: ["$csat_number", 5] }, 1, 0] } },
              csat_6: { $sum: { $cond: [{ $eq: ["$csat_number", 6] }, 1, 0] } },
              csat_7: { $sum: { $cond: [{ $eq: ["$csat_number", 7] }, 1, 0] } },
              csat_8: { $sum: { $cond: [{ $eq: ["$csat_number", 8] }, 1, 0] } },
              csat_9: { $sum: { $cond: [{ $eq: ["$csat_number", 9] }, 1, 0] } },
            },
          },

          // ✅ average score INCLUDING N/A in total calls
          {
            $addFields: {
              csat_avg_score: {
                $cond: [
                  { $eq: ["$csat_total_calls", 0] },
                  0,
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$csat_score_sum",
                          { $multiply: ["$csat_total_calls", 5] }
                        ]
                      },
                      100
                    ]
                  }
                  // { $divide: ["$csat_score_sum", "$csat_total_calls"] }, // ✅ includes N/A
                ],
              },
            },
          },
        ]).exec()
      ]);

      // Early return if no data
      if ((!cdrsSummaryDetails || cdrsSummaryDetails.length === 0) && (!cdrsAggregateDetails || cdrsAggregateDetails.length === 0)) {
        return finalArr;
      }

      // 🔹 BUILD MAPS FOR O(1) LOOKUPS
      const cdrsMap: any = {};
      (cdrsAggregateDetails || []).forEach((c: any) => {
        cdrsMap[`${c._id.user_uuid}_${c._id.report_date}`] = c;
      });

      const csatMap: any = {};
      (csatAgg || []).forEach((c: any) => {
        // csatMap[c._id] = c;
        csatMap[`${c._id.user_uuid}_${c._id.report_date}`] = c;
      });

      // 🔹 BUILD RESULT ARRAY WITH OPTIMIZED LOOKUPS
      const unifiedMap: any = {};
      
      (cdrsSummaryDetails || []).forEach((s) => {
        unifiedMap[`${s._id.user_uuid}_${s._id.report_date}`] = { summary: s };
      });
      
      (cdrsAggregateDetails || []).forEach((c) => {
        const key = `${c._id.user_uuid}_${c._id.report_date}`;
        if (!unifiedMap[key]) {
          unifiedMap[key] = {
            summary: {
              _id: c._id,
              username: [c.username],
              fullname: [c.fullname],
              totalInboundCalls: 0,
              totalOutboundCalls: 0,
              success: 0,
              answeredCalls: 0
            }
          };
        }
        unifiedMap[key].cdr = c;
      });

      if (campaign_uuid && campaign_uuid.length > 0) {
        // If filtering by campaign_uuid, we MUST ignore cdrs_summary-only records because they cannot be filtered.
        Object.keys(unifiedMap).forEach(key => {
          if (!unifiedMap[key].cdr) {
            delete unifiedMap[key];
          }
        });
      }

      finalArr = Object.values(unifiedMap).map((item: any) => {
        const data = item.summary;
        const cdrAgg = item.cdr || {};
        const isCampaignFiltered = (campaign_uuid && campaign_uuid.length > 0);
        let totalCalls, successfulCalls, billableSeconds, answeredCalls, inboundCount, outboundCount;
        
        if (isCampaignFiltered) {
          totalCalls = cdrAgg.totalCalls || 0;
          successfulCalls = cdrAgg.successfulCalls || 0;
          billableSeconds = cdrAgg.totalBillsecondsFromCdrs || cdrAgg.totalBillseconds || 0;
          answeredCalls = cdrAgg.answeredCalls || 0;
          inboundCount = cdrAgg.totalInboundCalls || 0;
          outboundCount = cdrAgg.totalOutboundCalls || 0;
        } else {
          totalCalls = cdrAgg.totalCalls || (data.totalInboundCalls + data.totalOutboundCalls) || 0;
          successfulCalls = data.success || cdrAgg.successfulCalls || 0;
          billableSeconds = data.totalBillseconds || cdrAgg.totalBillsecondsFromCdrs || 0;
          answeredCalls = data.answeredCalls || cdrAgg.answeredCalls || 0;
          inboundCount = cdrAgg.totalInboundCalls ?? data.totalInboundCalls ?? 0;
          outboundCount = cdrAgg.totalOutboundCalls ?? data.totalOutboundCalls ?? 0;
        }

        const totalRinging = cdrAgg.totalRingingTime || 0;
        const totalHold = cdrAgg.totalHoldTime || 0;
        const totalWaiting = cdrAgg.totalWaitingTime || 0;
        const totalDur = cdrAgg.totalDuration || 0;

        const avgRingingSec = totalCalls ? Math.floor(totalRinging / totalCalls) : 0;
        const avgHoldSec = totalCalls ? Math.floor(totalHold / totalCalls) : 0;
        const avgWaitingSec = totalCalls ? Math.floor(totalWaiting / totalCalls) : 0;
        const csat = csatMap[`${data._id.user_uuid}_${data._id.report_date}`] || {};
        const disconnectedByAgent = cdrAgg.disconnectedByAgent || 0;

        return {
          user_uuid: data._id.user_uuid,
          report_date: data._id.report_date,
          username: data.username[0],
          fullname: data.fullname[0],
          csat_avg_score: Number((csat.csat_avg_score || 0).toFixed(0)),
          inbound_call_count: inboundCount,
          outbound_call_count: outboundCount,
          totalCalls: totalCalls,
          successfulCalls: successfulCalls,
          billableSeconds: this.formatTimeFromSeconds(billableSeconds, true),
          answeredCalls: answeredCalls,
          totalInboundCalls: inboundCount,
          totalOutboundCalls: outboundCount,
          totalRingingTime: this.formatTimeFromSeconds(totalRinging, true),
          totalHoldTime: this.formatTimeFromSeconds(totalHold, true),
          totalWaitingTime: this.formatTimeFromSeconds(totalWaiting, true),
          totalDuration: this.formatTimeFromSeconds(totalDur, true),
          avgRingingTime: this.formatTimeFromSeconds(avgRingingSec, true),
          avgHoldTime: this.formatTimeFromSeconds(avgHoldSec, true),
          avgWaitingTime: this.formatTimeFromSeconds(avgWaitingSec, true),
          acd: this.calculateAcd(billableSeconds, successfulCalls),
          talk_time: this.formatTimeFromSeconds(billableSeconds, true),
          tenant_uuid,
          disconnected_by_agent: disconnectedByAgent,
        };
      });

      return finalArr;
    } catch (error) {
      Logger.error(`Error in catch block ==> fetchDataFromCdrsSummary()`, error.message);
      return finalArr;
    }
  }

  /*
  @Usage            : To get calculated ACD
  @Param acd        : Count of acd
  @Param success    : Count of success
  @Param billsecond : Total billsecond agent wise
  @return           : acd / talk time value in format [minutes:seconds]
  */

  // calculateAcd(acd, success, billsecond = "",formatToHHMMSS=false) {
  //   let val : any = (billsecond != "") ? billsecond : (acd / success);
  //   const duration = moment.duration(val, 'seconds');
  //   if(isNaN(val)) return "00:00:00";
  //   if(formatToHHMMSS){
  // return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;	
  //   }else{
  // 	return `${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;  
  //   }
  // }

  /*
  @Usage            : To format seconds into HH:MM:SS or MM:SS format
  @Param seconds    : Total seconds to format
  @Param formatToHHMMSS : Whether to include hours
  @return           : Formatted time string
  */
  formatTimeFromSeconds(seconds, formatToHHMMSS = false) {
    if (isNaN(seconds) || seconds < 0) return formatToHHMMSS ? "00:00:00" : "00:00";

    const duration = moment.duration(seconds, 'seconds');

    if (formatToHHMMSS) {
      const totalHours = Math.floor(duration.asHours());
      const minutes = duration.minutes();
      const secs = duration.seconds();
      return `${totalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      const minutes = duration.minutes();
      const secs = duration.seconds();
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /*
  @Usage            : To calculate Average Call Duration (ACD)
  @Param totalBillSeconds : Total billable seconds (talk time)
  @Param successfulCalls : Total success number of calls
  @return           : ACD in MM:SS format
  */
  calculateAcd(totalBillSeconds, successfulCalls) {
    if (!successfulCalls || successfulCalls === 0 || isNaN(totalBillSeconds)) {
      return "00:00";
    }

    const acdSeconds = totalBillSeconds / successfulCalls;
    return this.formatTimeFromSeconds(acdSeconds, false);
  }

  /*
  @Usage             : To get agent data logged in, break time , idle time
  @Param tenant_uuid : uuid of tenant
  @Param callstart   : callstart date 
  @Param callend     : callend date
  @Param allUsers    : Users that searched for 
  @return            : Agent's data with required details
  */

  async getAgentHistory(tenant_uuid, callstart, callend, allUsers, timezone) {
    try {
      callstart = moment.tz(callstart, timezone);
      callend = moment.tz(callend, timezone);

      let result = await this.agent_login_logout_report
        .aggregate([
          {
            $match: {
              tenant_uuid,
              agent_uuid: { $in: allUsers },
              createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() },
            },
          },
          {
            $lookup: {
              from: "breakcode",
              localField: "breakcode_uuid",
              foreignField: "uuid",
              as: "breakcode",
            },
          },
          {
            $addFields: {
              breakcode: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$breakcode_uuid", null] },
                      { $ne: ["$breakcode_uuid", ""] },
                    ],
                  },
                  { $arrayElemAt: ["$breakcode", 0] },
                  null,
                ],
              },
            },
          },
          {
            $sort: { createdAt: 1 }
          },
          {
            $group: {
              // _id: {
              //   agent_uuid: "$agent_uuid",
              // },
              _id: {
                agent_uuid: "$agent_uuid",
                report_date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                }
              },
              data: {
                $push: {
                  login_status: "$login_status",
                  date: "$createdAt",
                  breakcode_uuid: "$breakcode_uuid",
                  breakcode: "$breakcode",
                },
              },
            },
          },
        ])
        .exec();

      if (!result.length) return [];

      // 🔹 Pre-fetch ALL break codes once (instead of once per agent-day inside the loop)
      const allBreakUuids = new Set<string>();
      for (const agentDay of result) {
        for (const entry of agentDay.data) {
          if (entry.breakcode_uuid) allBreakUuids.add(entry.breakcode_uuid);
        }
      }
      const breakCodeMap: Record<string, string> = {};
      if (allBreakUuids.size > 0) {
        const fetchedCodes = await this.breakcode.find({ uuid: { $in: [...allBreakUuids] } }).lean();
        (fetchedCodes as any[]).forEach((bc: any) => { breakCodeMap[bc.uuid] = bc.billable; });
      }

      let hoursArr = [];

      for (let i = 0; i < result.length; i++) {
        let allEntries = result[i].data;
        let reportDateStr = result[i]._id.report_date;
        let todayStr = moment().tz(timezone).format("YYYY-MM-DD");
        
        // Use current time if today, otherwise end of day
        let dayEndBound = reportDateStr === todayStr 
          ? moment().tz(timezone).toDate() 
          : moment.tz(reportDateStr + " 23:59:59", "YYYY-MM-DD HH:mm:ss", timezone).toDate();

        // Calculate total sessions for this day
        let sessions = await this.get_total_session_time(allEntries, dayEndBound);
        let totalSessionTimeMs = sessions.reduce((acc, s) => acc + s.duration, 0);

        // Calculate ALL break hours (billable + non-billable)
        let allBreakHoursMs = await this.get_all_breakhours(allEntries, dayEndBound);

        // Calculate only non-billable break hours
        // let nonBillableBreakHoursMs = await this.get_non_billable_breakhours(allEntries, dayEndBound);

        let nonBillableBreakHoursMs = await this.get_non_billable_breakhours(allEntries, dayEndBound, breakCodeMap);

        // Billable break hours
        let billableBreakHoursMs = allBreakHoursMs - nonBillableBreakHoursMs;

        // Break details bifurcation
        let breakDetails = await this.get_break_details(allEntries, dayEndBound);

        // Gross login hours = total session - all breaks + billable breaks
        // OR simply: total session - non-billable breaks
        let grossLoginHours = totalSessionTimeMs;
        // let grossLoginHours = totalSessionTime - nonBillableBreakHoursMs;

        // Net login hours = total session - all breaks
        let netLoginHours = totalSessionTimeMs - nonBillableBreakHoursMs;
        // let netLoginHours = totalSessionTime - allBreakHoursMs;

        // Validate: should never be negative
        if (grossLoginHours < 0) {
          Logger.warn(`Negative gross login hours for agent ${result[i]._id.agent_uuid}`);
          grossLoginHours = 0;
        }

        if (netLoginHours < 0) {
          Logger.warn(`Negative net login hours for agent ${result[i]._id.agent_uuid}`);
          netLoginHours = 0;
        }

        hoursArr.push({
          // user_uuid: result[i]._id.agent_uuid,
          user_uuid: result[i]._id.agent_uuid,
          report_date: result[i]._id.report_date,
          loggedInHours: this.getTimeInHoursAndMinutes(grossLoginHours),
          breakHours: this.getTimeInHoursAndMinutes(allBreakHoursMs),
          net_login_hours: this.getTimeInHoursAndMinutes(netLoginHours),
          break_details: JSON.stringify(breakDetails),
        });
      }

      return hoursArr;
    } catch (error) {
      Logger.error(`Error in catch block ==> getAgentHistory()`, error.message);
    }
  }
  /*
    @Usage             : To get effective hours of logged in user by each date
    @Param allEntries  : Array of each date
    @return String     : gross hours
    */

  async getEffectiveHours(allEntries) {
    let effectiveHours = this.calculateEffectiveHours(allEntries);
    return effectiveHours
  }

  /*
  @Usage             : Calculate effective hours of logged in user by each date
  @Param allEntries  : Array of each date
  @return String     : difference between dates
  */

  async calculateEffectiveHours(allDates) {
    let i, calculateHours, effectiveHours = [];
    let len = allDates.length;
    len = len / 2;

    for (i = 0; i < len; i++) {
      try {
        calculateHours = this.calculateHours(allDates[i].date, allDates[i + 1].date, "EH");
        effectiveHours.push(calculateHours);
      } catch (error) {
        Logger.error("Error in calculating effective hours", error.message);
      }
    }

    // Do sum of all difference between dates
    var diff = effectiveHours.reduce((accumulator, currentValue) => {
      return accumulator + currentValue
    }, 0);
    return diff;
  }

  /*
  @Usage             : To calculate hours of logged in user by each date
  @Param startDate   : Start datetime of a day of logged in agent
  @Param endDate     : End datetime of a day of logged in agent
  @return Object     : Array of an object with total count of login logout report with data
  */

  calculateHours(startDate, endDate, type = "") {
    const date1: any = new Date(startDate);
    const date2: any = new Date(endDate);
    var diff = date2 - date1;
    return diff;
  }

  /*
  @Usage             : Convert difference in hour and minute
  @Param diff        : Time difference
  @return String     : Format [Ex : 1h 2m]
  */

  // getTimeInHoursAndMinutes(diff) {
  //   if (diff <= 0) return "00:00:00";
  //   const duration = moment.duration(diff, "milliseconds");
  //   return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
  // }

  getTimeInHoursAndMinutes(diff) {
    if (diff <= 0) return "00:00:00";

    const duration = moment.duration(diff, "milliseconds");

    // ✅ Calculate total hours including days
    const totalHours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    return `${totalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /*
  @Usage             : To get single data for each user
  @Param hoursArr    : Combined data of all dates with user's
  @return Object 
  */

  getSingleDataForEachUser(hoursArr) {
    interface RowType {
      user_uuid: string;
      _logged_ms: number;
      _break_ms: number;
      _net_ms: number;
      loggedInHours?: string;
      breakHours?: string;
      net_login_hours?: string;
    }

    const arr = hoursArr as RowType[];

    const combined: Record<string, RowType> = {};

    for (const row of arr) {
      if (!combined[row.user_uuid]) {
        combined[row.user_uuid] = {
          user_uuid: row.user_uuid,
          _logged_ms: 0,
          _break_ms: 0,
          _net_ms: 0,
        };
      }

      combined[row.user_uuid]._logged_ms += row._logged_ms ?? 0;
      combined[row.user_uuid]._break_ms += row._break_ms ?? 0;
      combined[row.user_uuid]._net_ms += row._net_ms ?? 0;
    }

    return Object.values(combined).map((u) => ({
      user_uuid: u.user_uuid,
      loggedInHours: this.getTimeInHoursAndMinutes(u._logged_ms),
      breakHours: this.getTimeInHoursAndMinutes(u._break_ms),
      net_login_hours: this.getTimeInHoursAndMinutes(u._net_ms),
    }));
  }

  /*
  @Usage                  : Combine calls data and agent data
  @Param callsData        : Calls data
  @Param getAgentHistory  : Agent's data
  @return Array 
  */

  mergeCallsAndAgentData(callsData, getAgentHistory) {
    // let filterData, finalData = [];
    let finalData = [];

    // 🔹 Build O(1) lookup map — replaces O(n) .filter() scan per call record
    const agentHistoryMap = new Map<string, any>();
    (getAgentHistory || []).forEach(item => {
      agentHistoryMap.set(`${item.user_uuid}_${item.report_date}`, item);
    });

    // callsData?.map((data) => {
    //   // filterData = getAgentHistory?.filter(item => item.user_uuid == data.user_uuid); //Compare user uuid
    //   filterData = getAgentHistory?.filter(item =>
    //     item.user_uuid == data.user_uuid &&
    //     item.report_date == data.report_date
    //   );
    //   if (filterData?.length) {
    //     finalData.push({ ...data, login_hours: filterData[0].loggedInHours, break_time: filterData[0].breakHours, net_login_hours: filterData[0].net_login_hours, break_details: filterData[0].break_details });
    //   } else {
    //     finalData.push({ ...data, login_hours: '0h 0m', break_time: '0h 0m', net_login_hours: "00:00:00", break_details: "{}" });
    //   }
    // });

    callsData?.map((data) => {
      const agentRecord = agentHistoryMap.get(`${data.user_uuid}_${data.report_date}`);
      if (agentRecord) {
        finalData.push({ ...data, login_hours: agentRecord.loggedInHours, break_time: agentRecord.breakHours, net_login_hours: agentRecord.net_login_hours, break_details: agentRecord.break_details });
      } else {
        finalData.push({ ...data, login_hours: '0h 0m', break_time: '0h 0m', net_login_hours: "00:00:00", break_details: "{}" });
      }
    });


    // if (callsData == undefined) {
    //   getAgentHistory?.map((data) => {
    //     finalData.push({ ...data, login_hours: data.loggedInHours, break_time: data.breakHours, user_uuid: data.user_uuid, });
    //   });
    // }

    // if (callsData == undefined) {
    //   getAgentHistory?.map((data) => {
    //     finalData.push({
    //       ...data,
    //       login_hours: data.loggedInHours,
    //       break_time: data.breakHours,
    //       user_uuid: data.user_uuid,

    //       // Ensure new report fields exist with sensible defaults
    //       totalCalls: 0,
    //       successfulCalls: 0,
    //       billableSeconds: 0,
    //       totalInboundCalls: 0,
    //       totalOutboundCalls: 0,
    //       answeredCalls: 0,
    //       totalRingingTime: this.calculateAcd("", "", "0", true),
    //       totalHoldTime: this.calculateAcd("", "", "0", true),
    //       totalWaitingTime: this.calculateAcd("", "", "0", true),
    //       totalDuration: this.calculateAcd("", "", "0", true),
    //       avgRingingTime: this.calculateAcd("", "", "0", true),
    //       avgHoldTime: this.calculateAcd("", "", "0", true),
    //       avgWaitingTime: this.calculateAcd("", "", "0", true),
    //       inbound_call_count: 0,
    //       outbound_call_count: 0,
    //       acd: this.calculateAcd("", "", "0", true),
    //       talk_time: this.calculateAcd("", "", "0", true),
    //       tenant_uuid: data.tenant_uuid
    //     });
    //   });
    // }

    if (callsData == undefined) {
      getAgentHistory?.map((data) => {
        finalData.push({
          ...data,
          login_hours: data.loggedInHours,
          break_time: data.breakHours,
          net_login_hours: data.net_login_hours,
          user_uuid: data.user_uuid,

          // Ensure new report fields exist with sensible defaults
          totalCalls: 0,
          successfulCalls: 0,
          billableSeconds: this.formatTimeFromSeconds(0, true),
          totalInboundCalls: 0,
          totalOutboundCalls: 0,
          answeredCalls: 0,
          totalRingingTime: this.formatTimeFromSeconds(0, true),
          totalHoldTime: this.formatTimeFromSeconds(0, true),
          totalWaitingTime: this.formatTimeFromSeconds(0, true),
          totalDuration: this.formatTimeFromSeconds(0, true),
          avgRingingTime: this.formatTimeFromSeconds(0, true),
          avgHoldTime: this.formatTimeFromSeconds(0, true),
          avgWaitingTime: this.formatTimeFromSeconds(0, true),
          inbound_call_count: 0,
          outbound_call_count: 0,
          acd: "00:00",  // ✅ ACD should be in MM:SS format
          talk_time: this.formatTimeFromSeconds(0, true),
          csat_avg_score: 0,
          report_date: new Date(),
          tenant_uuid: data.tenant_uuid
        });
      });
    }
    return finalData;
  }

  /*
  @Usage           : To get disposition details with count
  @Param data      : Calls data
  @return Object   : Array of an object with disposition details
  */

  async fetchDispositionsDetails(data) {
    let { id, tenant_uuid, callstart, callend, timezone } = data;
    callstart = moment.tz(callstart, timezone);
    callend = moment.tz(callend, timezone);
    //createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() }
    let result = await this.cdrs.aggregate([
      {
        $match: { tenant_uuid, user_uuid: id, createdAt: { $gte: callstart.toDate(), $lte: callend.toDate() } }
      },
      {
        $lookup: { from: "disposition", localField: "hangup_cause", foreignField: "disposition_uuid", as: "disposition" }
      },
      {
        $group: {
          _id: {
            user_uuid: "$user_uuid",
            disposition: "$hangup_cause",
          },
          count: { $sum: 1 },
          disposition_name: { "$first": "$disposition.name" },
        }
      }
    ]).exec();
    let statusCode = HttpStatus.NOT_FOUND;
    let finalArray = [];
    if (result.length) {
      statusCode = HttpStatus.OK;
      result.map((data) => {
        finalArray.push({
          user_uuid: data._id.user_uuid,
          disposition_name: data.disposition_name[0],
          count: data.count
        });
      });
    }
    return this.commonDbFn.sendResponseWithMessage(statusCode, finalArray);
  }

  /*
  @Usage             : To get agent data logged in, break time , idle time
  @Param tenant_uuid : uuid of tenant
  @Param callstart   : callstart date 
  @Param callend     : callend date
  @Param allUsers    : Users that searched for 
  @return            : Agent's data with required details
  */

  async getIdleAndACWTime(tenant_uuid, callstart, callend, allUsers, timezone) {
    try {
      const dayStart = moment.tz(callstart, timezone).startOf('day').toDate();
      const dayEnd   = moment.tz(callend, timezone).endOf('day').toDate();
      const todayStr = moment().tz(timezone).format("YYYY-MM-DD");

      // 🔹 2 queries for the FULL date range regardless of how many days
      const [stateResults, loginResults] = await Promise.all([
        this.idle_state_agent.find({
          tenant_uuid,
          agent_uuid: { $in: allUsers },
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).sort({ createdAt: 1 }).lean().exec(),

        this.agent_login_logout_report.find({
          tenant_uuid,
          agent_uuid: { $in: allUsers },
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).sort({ createdAt: 1 }).lean().exec()
      ]);

      // 🔹 Pre-group state records by user_uuid for O(1) per-user access
      const stateByUser = new Map<string, { status: string; date: any }[]>();
      for (const r of stateResults) {
        const key = (r as any).agent_uuid;
        if (!stateByUser.has(key)) stateByUser.set(key, []);
        stateByUser.get(key).push({ status: String((r as any).status), date: (r as any).createdAt });
      }

      // 🔹 Pre-group login records by (user_uuid + date_string) for O(1) per-user-day access
      const loginByUserDate = new Map<string, { login_status: any; date: any; breakcode_uuid: any }[]>();
      for (const r of (loginResults as any[])) {
        const dateStr = moment(r.createdAt).tz(timezone).format("YYYY-MM-DD");
        const key = `${r.agent_uuid}_${dateStr}`;
        if (!loginByUserDate.has(key)) loginByUserDate.set(key, []);
        loginByUserDate.get(key).push({ login_status: r.login_status, date: r.createdAt, breakcode_uuid: r.breakcode_uuid });
      }

      const finalArray = [];
      // const reportDate = moment(dayStart).format("YYYY-MM-DD");

      // for (const userUuid of allUsers) {
      //   // Get user's sessions for the day
      //   const userLoginEntries = loginResults.filter(r => r.agent_uuid === userUuid).map((r: any) => ({
      //     login_status: r.login_status,
      //     date: r.createdAt,
      //     breakcode_uuid: r.breakcode_uuid
      //   }));
        
      //   const sessions = await this.get_total_session_time(userLoginEntries, dayEnd);
      //   if (sessions.length === 0) continue;

      //   // Get and clean user's state records
      //   const userStates = stateResults.filter(r => r.agent_uuid === userUuid).map((r: any) => ({
      //     status: String(r.status),
      //     date: r.createdAt
      //   }));
      //   const cleanedStates = this.cleanStateRecords(userStates);

      //   const stateDurations = {}; // status -> total seconds

      //   for (const session of sessions) {
      //     const sStart = new Date(session.start).getTime();
      //     const sEnd = new Date(session.end).getTime();

      //     // States within or overlapping this session
      //     const sessionStates = cleanedStates.filter(s => {
      //       const sTime = new Date(s.date).getTime();
      //       return sTime >= sStart && sTime <= sEnd;
      //     });

      //     let lastMarker = sStart;
      //     let currentStatus = "0"; // Default to Idle

      //     // If there's a state record exactly at or before session start, use it
      //     const stateBefore = [...cleanedStates].reverse().find(s => new Date(s.date).getTime() <= sStart);
      //     if (stateBefore) {
      //       currentStatus = stateBefore.status;
      //     } else if (sessionStates.length > 0) {
      //       // If no state before, use the status of the first record in session
      //       currentStatus = sessionStates[0].status;
      //     }

      //     for (const state of sessionStates) {
      //       const stateTime = new Date(state.date).getTime();
      //       const durationArr = (stateTime - lastMarker) / 1000;
      //       if (durationArr > 0) {
      //         stateDurations[currentStatus] = (stateDurations[currentStatus] || 0) + durationArr;
      //       }
      //       currentStatus = state.status;
      //       lastMarker = stateTime;
      //     }

      //     // Cover from Last Record to Session End
      //     const finalDuration = (sEnd - lastMarker) / 1000;
      //     if (finalDuration > 0) {
      //       stateDurations[currentStatus] = (stateDurations[currentStatus] || 0) + finalDuration;
      //     }
      //   }

      //   finalArray.push({
      //     user_uuid: userUuid,
      //     report_date: reportDate,
      //     durations: stateDurations
      //   });
      // }

      for (const userUuid of allUsers) {
        // 🔹 Clean state records once per user (not per session/day)
        const rawStates = stateByUser.get(userUuid) ?? [];
        const cleanedStates = this.cleanStateRecords(rawStates);
        const reversedStates = [...cleanedStates].reverse(); // pre-reversed for stateBefore lookup

        // Collect all dates this user has login activity for
        const userDates = new Set<string>();
        for (const key of loginByUserDate.keys()) {
          if (key.startsWith(`${userUuid}_`)) {
            userDates.add(key.slice(userUuid.length + 1));
          }
        }

        for (const reportDate of userDates) {
          // Per-day effective end: current time if today, else 23:59:59
          const effectiveDayEnd = reportDate === todayStr
            ? moment().tz(timezone).toDate()
            : moment.tz(`${reportDate} 23:59:59`, "YYYY-MM-DD HH:mm:ss", timezone).toDate();

          const userLoginEntries = loginByUserDate.get(`${userUuid}_${reportDate}`) ?? [];
          const sessions = await this.get_total_session_time(userLoginEntries, effectiveDayEnd);
          if (sessions.length === 0) continue;

          const stateDurations: Record<string, number> = {};

          for (const session of sessions) {
            const sStart = new Date(session.start).getTime();
            const sEnd   = new Date(session.end).getTime();

            // States within this session window
            const sessionStates = cleanedStates.filter(s => {
              const t = new Date(s.date).getTime();
              return t >= sStart && t <= sEnd;
            });

            let lastMarker   = sStart;
            let currentStatus = "0"; // Default to Idle

            // Find the most recent state before session start (pre-reversed array)
            const stateBefore = reversedStates.find(s => new Date(s.date).getTime() <= sStart);
            if (stateBefore) {
              currentStatus = stateBefore.status;
            } else if (sessionStates.length > 0) {
              currentStatus = sessionStates[0].status;
            }

            for (const state of sessionStates) {
              const stateTime   = new Date(state.date).getTime();
              const durationSec = (stateTime - lastMarker) / 1000;
              if (durationSec > 0) {
                stateDurations[currentStatus] = (stateDurations[currentStatus] || 0) + durationSec;
              }
              currentStatus = state.status;
              lastMarker    = stateTime;
            }

            // Attribute remaining time in the session to the last known status
            const finalDuration = (sEnd - lastMarker) / 1000;
            if (finalDuration > 0) {
              stateDurations[currentStatus] = (stateDurations[currentStatus] || 0) + finalDuration;
            }
          }

          finalArray.push({ user_uuid: userUuid, report_date: reportDate, durations: stateDurations });
        }
      }

      return finalArray;
    } catch (error) {
      Logger.error(`Error in getIdleAndACWTime: ${error.message}`);
      return [];
    }
  }

  /*
  @Usage         : To add total time
  @Param time1   : first time to add
  @Param time2   : second time to add 
  @return String : (hh:mm) format
  */

  addTimeDurations(time1, time2) {
    const momentTime1 = moment.duration(time1);
    const momentTime2 = moment.duration(time2);
    const result = momentTime1.add(momentTime2);

    return `${result.hours().toString().padStart(2, '0')}:${result.minutes().toString().padStart(2, '0')}:${result.seconds().toString().padStart(2, '0')}`;
  }

  /*
  @Usage                    : To add total time
  @Param callsAndAgentData  : Contains user's call and agent history data
  @Param agentIdleData      : Contains agent idle & acw data 
  @return                   : Array of an object with combined values
  */

  mergeCallsAgentAndIdleData(callsAndAgentData, agentIdleData) {
    let finalData = [];

    // 🔹 Build O(1) lookup map — replaces O(n) .find() scan per merged record
    const idleMap = new Map<string, any>();
    (agentIdleData || []).forEach(item => {
      idleMap.set(`${item.user_uuid}_${item.report_date}`, item);
    });

    callsAndAgentData?.forEach((data) => {
      // const idleInfo = agentIdleData?.find(item =>
      //   item.user_uuid === data.user_uuid &&
      //   item.report_date === data.report_date
      // );
      const idleInfo = idleMap.get(`${data.user_uuid}_${data.report_date}`);

      if (idleInfo) {
        // Talk Time Calibration
        // User says: CDR Talk Time is the truth. 
        // We calculate State Talk Time (Status 1/2) and find the difference.
        // If CDR Talk > State Talk, we subtract the difference from Idle.
        
        const cdrTalkSec = this.timeToSeconds(data.talk_time);
        const stateTalkSec = (idleInfo.durations[1] || 0) + (idleInfo.durations[2] || 0);
        const talkDiff = cdrTalkSec - stateTalkSec;

        let idleSec = (idleInfo.durations[0] || 0) - talkDiff;
        if (idleSec < 0) idleSec = 0; // Guard against extreme anomalies
        if (idleSec < 0) {
          // If talk difference is so large it eats all idle time, we should still cap it at 0
          // and maybe take from other categories, but usually Idle is the dumping ground.
          idleSec = 0;
        }

        finalData.push({
          ...data,
          total_idle_time: this.formatTimeFromSeconds(idleSec, true),
          total_acw_time: this.formatTimeFromSeconds(idleInfo.durations[5] || 0, true),
          total_pause_time: this.formatTimeFromSeconds(idleInfo.durations[4] || 0, true),
          totalHoldTime: this.formatTimeFromSeconds(idleInfo.durations[7] || 0, true),
        });
      } else {
        finalData.push({
          ...data,
          total_idle_time: "00:00:00",
          total_acw_time: "00:00:00",
          total_pause_time: "00:00:00",
          total_hold_time: "00:00:00"
        });
      }
    });

    return finalData;
  }

  /*
  @Usage            : Convert HH:MM:SS string to seconds
  @Param timeStr    : time string format HH:MM:SS
  @return           : total seconds
  */
  timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    } else if (parts.length === 2) {
      return (parts[0] * 60) + parts[1];
    }
    return 0;
  }

  /**
   * Helper to clean state records: sort, deduplicate timestamps, and remove consecutive identical states
   */
  cleanStateRecords(records) {
    if (!records || records.length === 0) return [];

    // 1. Precision Sort by createdAt
    const sorted = [...records].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      // If same millisecond, keep original order or use ObjectId if available
      return 0;
    });

    // 2. Deduplicate timestamps (keep last record at any given millisecond)
    const dedupedByTimestamp = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i < sorted.length - 1 && new Date(sorted[i].date).getTime() === new Date(sorted[i + 1].date).getTime()) {
        continue; // Skip this one, next one has same timestamp
      }
      dedupedByTimestamp.push(sorted[i]);
    }

    // 3. Remove consecutive identical states
    const cleaned = [];
    for (const record of dedupedByTimestamp) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1].status === record.status) {
        continue;
      }
      cleaned.push(record);
    }

    return cleaned;
  }

  async get_loginhours(alldata) {
    let i, j, calculateHours, effectiveHours = [], loginentries = [];
    let len = alldata.length;
    for (i = 0; i < len; i++) {
      if (alldata[i].breakcode_uuid == undefined) {
        loginentries.push(alldata[i])
      }
    }
    // console.log( loginentries );
    let login_len = loginentries.length;
    // login_len = login_len / 2;

    for (j = 0; j < login_len; j += 2) {
      try {
        // console.log( 'first entry', loginentries[ j ].date );
        // console.log( 'first entry status', loginentries[ j ].login_status );
        // console.log( 'first increment enrty', loginentries[ j + 1 ].date );
        // console.log( 'first increment status', loginentries[ j + 1 ].login_status );
        if (loginentries[j].login_status == 0 && loginentries[j + 1].login_status == 2) {
          calculateHours = this.calculateHours(loginentries[j].date, loginentries[j + 1].date, "EH");
          // console.log( 'calculate_hours', calculateHours );
          effectiveHours.push(calculateHours);
        }

      } catch (error) {
        Logger.error("Error in calculating effective hours", error.message);
      }
    }

    var diff = effectiveHours.reduce((accumulator, currentValue) => {
      return accumulator + currentValue
    }, 0);
    return diff;

  }

  async get_breakhours(alldata) {
    let i, j, calculateHours, effectiveHours = [], breakentries = [];
    let len = alldata.length;
    for (i = 0; i < len; i++) {
      if (alldata[i].breakcode_uuid != undefined && alldata[i].breakcode_uuid != '') {
        breakentries.push(alldata[i]);
      }
    }

    let break_len = breakentries.length;
    // break_len = break_len / 2;

    for (j = 0; j < break_len; j += 2) {
      try {
        if (breakentries[j].login_status == 1 && breakentries[j + 1].login_status == 0 && breakentries[j + 1].breakcode_uuid != '') {
          calculateHours = this.calculateHours(breakentries[j].date, breakentries[j + 1].date, "EH");
          effectiveHours.push(calculateHours);
        }

      } catch (error) {
        Logger.error("Error in calculating effective hours", error.message);
      }
    }
    // console.log( effectiveHours );

    var diff = effectiveHours.reduce((accumulator, currentValue) => {
      return accumulator + currentValue
    }, 0);
    return diff;

  }



}
