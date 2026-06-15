import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as moment from 'moment-timezone';
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { AgentLoginLogoutDocument, AgentLoginLogoutSchema } from "../../call-center/schema/agent-login-logout.schema";
import { all } from "axios";
import { BreakcodeDocument, BreakcodeSchema } from "src/modules/breakcode/schema/breakcode.schema";

@Injectable()
export class LoginlogoutreportService {

     constructor(
          // @InjectModel( CdrsSchema.name ) private readonly cdrs: Model<CdrsDocument>,
          @InjectModel(AgentLoginLogoutSchema.name) private readonly agent_login_logout_report: Model<AgentLoginLogoutDocument>,
          @InjectModel(BreakcodeSchema.name) private readonly breakcode: Model<BreakcodeDocument>,

          private readonly commonDbFn: CommonDBFunctions,
          private readonly commonFn: CommonFunctions,
     ) { }

     /**
 * Calculate non-billable break hours (where billable = "1")
 * @param alldata - Array of login/logout data
 * @returns Total non-billable break hours in milliseconds
 */
     // ==================== FUNCTION WITH COMPREHENSIVE LOGGING ====================

     // async get_non_billable_breakhours(alldata) {
     //      let i, j, calculateHours, effectiveHours = [], breakentries = [];
     //      let len = alldata.length;

     //      // Filter entries that have breakcode_uuid
     //      for (i = 0; i < len; i++) {
     //           if (alldata[i].breakcode_uuid != undefined && alldata[i].breakcode_uuid != '') {
     //                console.log(`Entry ${i} has breakcode_uuid: ${alldata[i].breakcode_uuid}`);
     //                breakentries.push(alldata[i]);
     //           }
     //      }

     //      // Fetch break codes to check billable status
     //      let breakCodeUuids = breakentries.map(entry => entry.breakcode_uuid).filter(Boolean);
     //      let uniqueBreakCodeUuids = [...new Set(breakCodeUuids)];

     //      let breakCodes = await this.breakcode.find({
     //           uuid: { $in: uniqueBreakCodeUuids }
     //      }).lean();

     //      // Create a map for quick lookup
     //      let breakCodeMap = {};
     //      breakCodes.forEach((bc: any) => {
     //           breakCodeMap[bc.uuid] = bc.billable;
     //           console.log(`Map: ${bc.uuid} -> billable: ${bc.billable}`);
     //      });

     //      // Filter only non-billable breaks (billable = "1")
     //      let nonBillableBreakEntries = [];
     //      for (i = 0; i < breakentries.length; i++) {
     //           let breakCodeUuid = breakentries[i].breakcode_uuid;
     //           let billableStatus = breakCodeMap[breakCodeUuid];

     //           if (breakCodeMap[breakCodeUuid] === "1") {
     //                nonBillableBreakEntries.push(breakentries[i]);
     //           }
     //      }

     //      let break_len = nonBillableBreakEntries.length;
     //      break_len = break_len / 2;

     //      // Calculate hours for non-billable breaks
     //      for (j = 0; j < break_len; j++) {
     //           try {
     //                let startDate = nonBillableBreakEntries[j].date;
     //                let endDate = nonBillableBreakEntries[j + 1].date;
     //                calculateHours = this.calculateHours(startDate, endDate, "EH");
     //                effectiveHours.push(calculateHours);
     //           } catch (error: any) {
     //                Logger.error("Error in calculating non-billable break hours", error.message);
     //           }
     //      }

     //      var diff = effectiveHours.reduce((accumulator, currentValue) => {
     //           return accumulator + currentValue;
     //      }, 0);

     //      return diff;
     // }


     // async get_non_billable_breakhours(alldata) {
     //      // Step 1: All break entries
     //      let breakentries = alldata.filter(
     //           x => x.breakcode_uuid !== undefined && x.breakcode_uuid !== ""
     //      );

     //      if (breakentries.length === 0) return 0;

     //      // Step 2: Get unique breakcodes
     //      let breakCodeUuids = [...new Set(breakentries.map(x => x.breakcode_uuid))];

     //      // Step 3: Load breakcodes with billable status
     //      let breakCodes = await this.breakcode.find({
     //           uuid: { $in: breakCodeUuids }
     //      }).lean();

     //      // Step 4: Create map: uuid → billable
     //      let breakCodeMap: any = {};
     //      breakCodes.forEach((bc: any) => {
     //           breakCodeMap[bc.uuid] = bc.billable; // "0" or "1"
     //      });

     //      // Step 5: Filter only **non-billable**       entries
     //      // billable === "1" → NON-BILLABLE (your logic)
     //      let nonBillableBreakEntries = breakentries.filter(
     //           x => breakCodeMap[x.breakcode_uuid] === "1"
     //      );

     //      // If no non-billable breaks
     //      if (nonBillableBreakEntries.length < 2) return 0;

     //      // Step 6: If odd number of entries → drop last (incomplete break)
     //      if (nonBillableBreakEntries.length % 2 !== 0) {
     //           nonBillableBreakEntries.pop();
     //      }

     //      let effectiveHours = [];

     //      // Step 7: Iterate in correct pairs: (0-1), (2-3), (4-5), ...
     //      for (let i = 0; i < nonBillableBreakEntries.length - 1; i += 2) {
     //           try {
     //                let start = nonBillableBreakEntries[i].date;
     //                let end = nonBillableBreakEntries[i + 1].date;

     //                let calculateHours = this.calculateHours(start, end, "EH");
     //                effectiveHours.push(calculateHours);
     //           } catch (err) {
     //                Logger.error("Error calculating non-billable break hours", err.message);
     //           }
     //      }

     //      // Step 8: Sum all minutes
     //      return effectiveHours.reduce((acc, n) => acc + n, 0);
     // }

     async fetchLoginLogoutReportStatistics(queryParams) {
          const { tenant_uuid, limit, page } = queryParams;
          const perPage = Number(limit) || 10;
          const currentPage = Number(page) || 1;
          const skip = perPage * (currentPage - 1);
          // const isExport = queryParams.export === true || queryParams.export === 'true';

          // let startDate = queryParams.startDate.substring(0, 10);
          // let endDate = queryParams.endDate.substring(0, 10);

          const todayStart = moment().format("YYYY-MM-DD 00:00:00");
          const todayEnd = moment().format("YYYY-MM-DD 23:59:59");

          let startDate = queryParams.startDate
               ? queryParams.startDate.substring(0, 19)
               : todayStart;

          let endDate = queryParams.endDate
               ? queryParams.endDate.substring(0, 19)
               : todayEnd;
          // console.log( queryParams )

          // let match: any = {
          //      tenant_uuid: tenant_uuid,
          //      "date": { "$gte": startDate, "$lte": endDate }
          // };

          let match: any = {
               tenant_uuid: tenant_uuid,
               date: { "$gte": startDate.substring(0, 10), "$lte": endDate.substring(0, 10) }
          };
          let lookupDetails = { from: "user", localField: "agent_uuid", foreignField: "uuid", as: "agent" };
          let unwindAgent = { $unwind: "$agent" };
          let groupByDetails = {
               _id: { date: "$date", agent_uuid: "$agent_uuid" },
               data: {
                    $push: { login_status: "$login_status", date: "$createdAt", breakcode_uuid: "$breakcode_uuid" }
               },
               "date": { "$first": "$date" },
               "agent_uuid": { "$first": "$agent_uuid" },
               "createdAt": { "$first": "$createdAt" },
               'agent': { "$first": '$agent' }
          }

          let sort = { date: -1, agent_uuid: 1 };
          // let newlimit = parseInt( limit, 10 );
          let projection = { "data": 1, "date": 1, "agent_uuid": 1, 'agent': 1, "createdAt": 1 }
          let response = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, match, lookupDetails, groupByDetails, sort, perPage, projection, unwindAgent, skip);
          // let response = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, match, lookupDetails, groupByDetails, sort, isExport ? "" : perPage, projection, unwindAgent, isExport ? 0 : skip);
          let newresponse = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, match, lookupDetails, groupByDetails, sort, "", projection, unwindAgent);
          let i, grossHours, finalArray = [], obj = {}, dateLen, last_login_date, effectiveHours, createdAt, count, login_stat, first, last, last_converted_date, first_converted_date, total_break_hours, breakcount;
          // console.log( response );
          let len = response.length;

          const breakCodes = await this.breakcode.find({ tenant_uuid }).lean();
          const breakCodeMap: Record<string, string> = {};
          breakCodes.forEach((bc: any) => { breakCodeMap[bc.uuid] = bc.billable; });

          for (i = 0; i <= len; i++) {
               if (response[i]?.data.length) {
                    // console.log( response[ i ] );
                    // console.log( response[ i ].data[ i ].agent );
                    response[i].data.sort((a, b) => {
                         const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
                         if (diff !== 0) return diff;
                         return Number(a.login_status) - Number(b.login_status);
                    });
                    response[i].data = this.deduplicateEntries(response[i].data);
                    dateLen = response[i]?.data.length;

                    let reportDate = moment.tz(response[i]?.date, queryParams.timezone).startOf('day');
                    let now = moment().tz(queryParams.timezone);
                    let dayEnd = reportDate.isSame(now, 'day') ? now.toDate() : reportDate.endOf('day').toDate();
                    grossHours = await this.get_loginhours(response[i].data, dayEnd);
                    console.log('login_hours', grossHours)
                    // grossHours = await this.calculateHours( response[ i ]?.data[ 0 ].date, response[ i ]?.data[ dateLen - 1 ].date );
                    Logger.debug(`[LOGIN HOURS] agent=${response[i]?.agent_uuid} grossHours=${grossHours}`);
                    login_stat = await this.login_count(response[i]?.data, 'login_count');
                    breakcount = await this.login_count(response[i]?.data, 'break_count');
                    first = response[i]?.data[0].date;
                    // first_converted_date = moment( first ).utcOffset( queryParams.timezone ).format( "HH:mm" );
                    first_converted_date = moment.tz(first, queryParams.timezone).format("HH:mm:ss");
                    last_login_date = await this.get_last_login_date(response[i].data);
                    // console.log( last_login_date );
                    last = last_login_date == '' ? '00:00:00' : last_login_date;
                    // console.log( last );
                    if (last != '00:00:00') {
                         // last_converted_date = moment( last ).utcOffset( queryParams.timezone ).format( "HH:mm" );
                         last_converted_date = moment.tz(last, queryParams.timezone).format("HH:mm:ss");
                    } else {
                         last_converted_date = last;
                    }

                    // last = response[ i ]?.data[ dateLen - 1 ].date;

                    total_break_hours = await this.get_breakhours(response[i].data, dayEnd);
                    // console.log( 'break_hours', total_break_hours );
                    // grossHours = grossHours == undefined ? "0h 0m" : grossHours;
                    // total_break_hours = total_break_hours == undefined ? "0h 0m" : grossHours - total_break_hours;
                    let non_billable_break_hours = await this.get_non_billable_breakhours(response[i].data, dayEnd, breakCodeMap) || 0;
                    let net_login_hours = Math.max(grossHours - non_billable_break_hours, 0);

                    obj = {
                         date: response[i]?.date,
                         total_login_hours: this.getTimeInHoursAndMinutes(grossHours) || "00:00:00",
                         first_login_time: first_converted_date,
                         last_login_time: last_converted_date,
                         login_count: login_stat,
                         break_count: breakcount,
                         total_break_hours: this.getTimeInHoursAndMinutes(total_break_hours) || "00:00:00",

                         net_login: this.getTimeInHoursAndMinutes(net_login_hours) || "00:00:00",

                         agent_uuid: response[i]?.agent_uuid,
                         agent: response[i]?.agent,
                         createdAt: response[i].createdAt



                    };
                    finalArray.push(obj);
               }
          }


          if (newresponse.length > 0) {
               count = newresponse.length;
               Logger.debug(count, "Search result count");
               return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, finalArray, count)
          } else {
               Logger.error(count, "Search result count");
               return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, finalArray, count)
          }

          // let statusCode = finalArray.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
          // return this.commonDbFn.sendResponseWithMessage( statusCode, finalArray );
     }

     deduplicateEntries(response: any[]) {
          if (!Array.isArray(response)) return response;

          const getEventKey = (entry: any): string => {
               const status = String(entry.login_status);
               const hasBreak = !!(entry.breakcode && entry.breakcode.length) || !!entry.breakcode_uuid;
               if (status === "0") {
                    return hasBreak ? "break_end" : "login";
               }
               if (status === "1") {
                    return hasBreak ? "break_start" : "empty";
               }
               if (status === "2") {
                    return "logout";
               }
               return status;
          };

          let lastKeptEntry: any = null;
          return response.filter(entry => {
               const timeStr = entry.date_time || entry.date;
               if (!timeStr) return true; // keep if no timestamp
               const key = getEventKey(entry);
               if (key === "empty") return false; // discard status 1 without breakcode (blank row)

               if (lastKeptEntry) {
                    const lastKey = getEventKey(lastKeptEntry);
                    const lastTimeStr = lastKeptEntry.date_time || lastKeptEntry.date;
                    const timeDiff = new Date(timeStr.toString()).getTime() - new Date(lastTimeStr.toString()).getTime();
                    if (key === lastKey && timeDiff < 60000) {
                         return false; // deduplicate same event type within 1 minute
                    }
               }
               lastKeptEntry = entry;
               return true;
          });
     }

     async fetchLoginLogoutEntries(queryParam) {
          try {
               // console.log( queryParam );
               const { date, agent_uuid } = queryParam;
               let populateFields = [{ path: "breakcode", select: "name break_code duration" }];
               if (date != "" && date != undefined) {
                    let response = await this.agent_login_logout_report.find({ date, agent_uuid: agent_uuid }, { date_time: 1, date: 1, createdAt: 1, login_status: 1, breakcode_uuid: 1 }).populate(populateFields).sort({ date_time: 1 }).exec();
                    if (Array.isArray(response)) { response = this.deduplicateEntries(response); }
                    let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
                    return this.commonDbFn.sendResponseWithMessage(statusCode, response);
               }
          } catch (error: any) {
               Logger.error(`Unable to fetch details`, error.message);
               return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Unable to fetch details`);
          }
     }

     async advancedSearch(searchParams) {
          // let match, response, count = 0;
          let j, objlen, searchobj, dateobj;
          let objectKeys, objectValues, filedName, filedValue, searchFlag, match: any = [], key, response, newresponse, count = 0;

          console.log(searchParams);
          let { role, tenant_uuid, timezone } = searchParams;
          match.push({ tenant_uuid: tenant_uuid });
          delete searchParams.tenant_uuid;


          // let populateFields = [ { path: "agent_uuid", select: 'user_name username' } ];
          let lookupDetails = { from: "user", localField: "agent_uuid", foreignField: "uuid", as: "agent" };
          let unwindAgent = { $unwind: "$agent" };
          let projection = { "data": 1, "date": 1, "agent_uuid": 1, 'agent': 1, "createdAt": 1 }
          if (searchParams.startDate != undefined && searchParams.endDate != undefined) {
               let startDate = searchParams.startDate.substring(0, 10);

               let endDate = searchParams.endDate.substring(0, 10);

               // if ( agent_uuid != undefined ) {
               //      match = {
               //           $and: [
               //                { tenant_uuid: tenant_uuid },
               //                { agent_uuid: agent_uuid },
               //                { date: { "$gte": `${startDate}`, "$lte": `${endDate}` } }
               //           ]
               //      };
               // } else {
               // match = {
               //      $and: [
               //           { tenant_uuid: tenant_uuid },
               //           { date: { "$gte": `${startDate}`, "$lte": `${endDate}` } }
               //      ]
               // };
               dateobj = { "date": { "$gte": `${startDate}`, "$lte": `${endDate}` } };
               match.push(dateobj);
               // }

          }
          // else {
          //      if ( agent_uuid != undefined ) {
          //           match = { tenant_uuid: tenant_uuid, agent_uuid: searchParams.agent_uuid };
          //      }
          // }


          //Pagination
          const perPage = Number(searchParams.limit) || 10;
          const currentPage = Number(searchParams.page) || 1;
          const skip = perPage * (currentPage - 1);
          //End

          delete searchParams.startDate;
          delete searchParams.endDate;
          delete searchParams.tenant_uuid;
          delete searchParams.role;
          delete searchParams.domain;
          delete searchParams.timezone;
          delete searchParams.limit;
          delete searchParams.page;

          objectKeys = Object.keys(searchParams);
          objectValues = Object.values(searchParams);
          objlen = objectKeys.length;

          /*if (len == 0) {
              return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
          }*/

          for (j = 0; j < objlen; j++) {
               filedName = objectKeys[j];
               filedValue = objectValues[j];
               if (filedName.includes("|")) {
                    key = filedName.split("|")[0].trim();
                    searchFlag = parseInt(filedName.split("|")[1].trim());
               } else {
                    key = filedName;
                    searchFlag = -1;
               }

               switch (searchFlag) {
                    case 1: //Begins with
                         searchobj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                         match.push(searchobj);
                         break;
                    case 2: // Contains
                         searchobj = { [key]: { $regex: filedValue, $options: "i" } };
                         match.push(searchobj);
                         break;
                    case 3: // Does not contains
                         searchobj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                         match.push(searchobj);
                         break;
                    case 4: // Is equal to
                         searchobj = { [key]: filedValue };
                         match.push(searchobj);
                         break;
                    case 5: // In not equal to
                         searchobj = { [key]: { $ne: filedValue } };
                         match.push(searchobj);
                         break;
                    case 6: //Ends with
                         searchobj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                         match.push(searchobj);
                         break;

                    default: //Begins with
                         searchobj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                         match.push(searchobj);
                         break;
               }
          }


          let groupByDetails = {
               _id: { date: "$date", agent_uuid: "$agent_uuid" },
               data: {
                    $push: { login_status: "$login_status", date: "$createdAt", breakcode_uuid: "$breakcode_uuid" }
               },
               "date": { "$first": "$date" },
               "agent_uuid": { "$first": "$agent_uuid" },
               "createdAt": { "$first": "$createdAt" },
               "agent": { "$first": "$agent" }
          }

          let sort = { date: -1, agent_uuid: 1 };

          response = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, { $and: match }, lookupDetails, groupByDetails, sort, perPage, projection, unwindAgent, skip);
          newresponse = await this.commonDbFn.fetchDataByGroup(this.agent_login_logout_report, { $and: match }, lookupDetails, groupByDetails, sort, "", projection, unwindAgent);

          // ✅ FETCH BREAK CODES for advancedSearch
          const breakCodes = await this.breakcode.find({ tenant_uuid }).lean();
          const breakCodeMap: Record<string, string> = {};
          breakCodes.forEach((bc: any) => { breakCodeMap[bc.uuid] = bc.billable; });

          let i, grossHours, finalArray = [], obj = {}, dateLen, effectiveHours, createdAt, login_stat, first, last_login_date, last, last_converted_date, first_converted_date, total_break_hours, breakcount;
          let len = response.length;

          // for ( i = 0; i <= len; i++ ) {
          //      if ( response[ i ]?.data.length ) {
          //           dateLen = response[ i ]?.data.length;
          //           grossHours = this.calculateHours( response[ i ]?.data[ 0 ].date, response[ i ]?.data[ dateLen - 1 ].date );
          //           effectiveHours = await this.getEffectiveHours( response[ i ]?.data )
          //           grossHours = grossHours == undefined ? "0h 0m" : grossHours;
          //           effectiveHours = effectiveHours == undefined ? "0h 0m" : grossHours - effectiveHours;
          //           obj = {
          //                date: response[ i ]?.date,
          //                effectiveHours: this.getTimeInHoursAndMinutes( effectiveHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( effectiveHours ),
          //                grossHours: this.getTimeInHoursAndMinutes( grossHours ) == undefined ? "0h 0m" : this.getTimeInHoursAndMinutes( grossHours ),
          //                agent_uuid: response[ i ].agent_uuid,
          //                createdAt: response[ i ].createdAt,


          //           };
          //           finalArray.push( obj );
          //      }
          // }

          for (i = 0; i < len; i++) {
               if (response[i]?.data.length) {
                    // console.log( response[ i ] );
                    // console.log( response[ i ].data[ i ] );
                    // grossHours = await this.calculateHours(response[i]?.data[0].date, response[i]?.data[dateLen - 1].date);
                    response[i].data.sort((a, b) => {
                         const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
                         if (diff !== 0) return diff;
                         return Number(a.login_status) - Number(b.login_status);
                    });
                    response[i].data = this.deduplicateEntries(response[i].data);
                    dateLen = response[i]?.data.length;

                    let reportDate = moment.tz(response[i]?.date, timezone).startOf('day');
                    let now = moment().tz(timezone);
                    let dayEnd = reportDate.isSame(now, 'day') ? now.toDate() : reportDate.endOf('day').toDate();
                    grossHours = await this.get_loginhours(response[i].data, dayEnd);
                    login_stat = await this.login_count(response[i]?.data, 'login_count');
                    breakcount = await this.login_count(response[i]?.data, 'break_count');
                    first = response[i]?.data[0].date;
                    // first_converted_date = moment( first ).utcOffset( timezone ).format( "HH:mm" );
                    first_converted_date = moment.tz(first, timezone).format("HH:mm:ss");
                    // last = response[ i ]?.data[ dateLen - 1 ].date;
                    // last_converted_date = moment( last ).utcOffset( timezone ).format( "HH:mm" );
                    // last_converted_date = moment.tz( last, timezone ).format( "HH:mm" );
                    last_login_date = await this.get_last_login_date(response[i].data);
                    // console.log( last_login_date );
                    last = last_login_date == '' ? '00:00:00' : last_login_date;
                    // console.log( last );
                    if (last != '00:00:00') {
                         // last_converted_date = moment( last ).utcOffset( queryParams.timezone ).format( "HH:mm" );
                         last_converted_date = moment.tz(last, timezone).format("HH:mm:ss");
                    } else {
                         last_converted_date = last;
                    }
                    total_break_hours = await this.get_breakhours(response[i].data, dayEnd);
                    // console.log( 'break_hours', total_break_hours );
                    // grossHours = grossHours == undefined ? "0h 0m" : grossHours;
                    // total_break_hours = total_break_hours == undefined ? "0h 0m" : grossHours - total_break_hours;
                    let non_billable_break_hours = await this.get_non_billable_breakhours(response[i].data, dayEnd, breakCodeMap);
                    // ✅ FIX Bug 9: advancedSearch path was missing Math.max guard — net login could go negative
                    let net_login_hours = Math.max(0, grossHours - non_billable_break_hours);
                    // total_break_hours = await this.get_breakhours(response[i].data);
                    // console.log( 'break_hours', total_break_hours );
                    grossHours = grossHours == undefined ? "00:00" : grossHours;
                    // total_break_hours = total_break_hours == undefined ? "0h 0m" : grossHours - total_break_hours;
                    obj = {
                         date: response[i]?.date,
                         total_login_hours: this.getTimeInHoursAndMinutes(grossHours) || "00:00:00",
                         first_login_time: first_converted_date,
                         last_login_time: last_converted_date,
                         login_count: login_stat,
                         break_count: breakcount,
                         total_break_hours: this.getTimeInHoursAndMinutes(total_break_hours) || "00:00:00",
                         net_login: this.getTimeInHoursAndMinutes(net_login_hours) || "00:00:00",
                         agent_uuid: response[i]?.agent_uuid,
                         agent: response[i]?.agent,
                         createdAt: response[i].createdAt


                    };
                    finalArray.push(obj);
               }
          }

          if (newresponse.length > 0) {
               count = newresponse.length;
               Logger.debug(count, "Search result count");
               return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, finalArray, count)
          } else {
               Logger.error(count, "Search result count");
               return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, finalArray, count)
          }
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

     // getTimeInHoursAndMinutes ( diff ) {
     //      // console.log( diff );
     //      if ( diff > 60e3 ) {
     //           let minutes = Math.floor( diff / 60e3 )
     //           var num = minutes;
     //           var hours = ( num / 60 );
     //           var rhours = Math.floor( hours );
     //           minutes = ( hours - rhours ) * 60;
     //           var rminutes = Math.round( minutes );

     //           return `${rhours}h ${rminutes}m`;
     //      }
     // }

     getTimeInHoursAndMinutes(diff) {
          if (diff >= 0) {
               let seconds = Math.floor(diff / 1000);
               let minutes = Math.floor(seconds / 60);
               let hours = Math.floor(minutes / 60);
               let remainingSeconds = seconds % 60;
               let remainingMinutes = minutes % 60;

               // Pad with leading zeros
               let formattedHours = hours.toString().padStart(2, '0');
               let formattedMinutes = remainingMinutes.toString().padStart(2, '0');
               let formattedSeconds = remainingSeconds.toString().padStart(2, '0');

               return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
          }
          return "00:00:00";
     }

     /*
    @Usage             : To get effective hours of logged in user by each date
    @Param allEntries  : Array of each date
    @return String     : gross hours
    */

     async getEffectiveHours(allEntries) {
          allEntries.shift();
          allEntries.pop();
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
               } catch (error: any) {
                    Logger.error("Error in calculating effective hours", error.message);
               }
          }

          // Do sum of all difference between dates
          var diff = effectiveHours.reduce((accumulator, currentValue) => {
               return accumulator + currentValue
          }, 0);
          return diff;
     }

     async login_count(alldata, login_state) {
          let i, count = 0;
          let len = alldata.length;

          for (i = 0; i < len; i++) {
               if (login_state == 'login_count') {
                    // ✅ FIX: breakcode_uuid is stored as "" on real login events, not undefined.
                    // "" == undefined → false, so entries with empty breakcode_uuid were missed.
                    // Use !breakcode_uuid (falsy for undefined, null, AND "").
                    if (alldata[i].login_status == '0' && !alldata[i].breakcode_uuid) {
                         count = count + 1;
                         // console.log( 'login_count', count )
                    }
               } else if (login_state == 'break_count') {
                    if (alldata[i].login_status == '1') {
                         count = count + 1;
                         // console.log( 'breakcount', count )
                    }
               }

          }
          // console.log( count );
          return count;
     }


     // async get_loginhours(alldata) {
     //      let i, j, calculateHours, effectiveHours = [], loginentries = [];
     //      let len = alldata.length;
     //      for (i = 0; i < len; i++) {
     //           if (alldata[i].breakcode_uuid == undefined) {
     //                loginentries.push(alldata[i])
     //           }
     //      }

     //      let login_len = loginentries.length;
     //      login_len = login_len / 2;
     //      console.log("login entriesss lengthhhhh",login_len);

     //      for (j = 0; j < login_len; j++) {
     //           try {
     //                calculateHours = this.calculateHours(loginentries[j].date, loginentries[j + 1].date, "EH");
     //                effectiveHours.push(calculateHours);
     //           } catch (error: any) {
     //                Logger.error("Error in calculating effective hours", error.message);
     //           }
     //      }

     //      console.log("effectiveHourseffectiveHours",effectiveHours)
     //      var diff = effectiveHours.reduce((accumulator, currentValue) => {
     //           return accumulator + currentValue
     //      }, 0);
     //      return diff;
     // }

     async get_loginhours(alldata, dayEnd) {
          if (alldata.length === 0) return 0;

          let totalDuration = 0;
          let sessionStart = null;
          let inSession = false;
          let dayEndDate = new Date(dayEnd);

          for (let i = 0; i < alldata.length; i++) {
               let entry = alldata[i];

               // Login (status=0) - start of session or return from break
               if (entry.login_status == 0 && !entry.breakcode_uuid) {
                    if (!inSession) {
                         sessionStart = entry.date;
                         inSession = true;
                    }
               }
               // Logout (status=2) - end of session
               else if (entry.login_status == 2) {
                    if (inSession && sessionStart) {
                         let duration = this.calculateHours(sessionStart, entry.date);
                         if (duration > 0) {
                              totalDuration += duration;
                         }
                         sessionStart = null;
                         inSession = false;
                    }
               }
          }

          // Handle case where agent is still logged in (no logout entry)
          if (inSession && sessionStart) {
               let boundEnd = new Date(sessionStart) > dayEndDate ? sessionStart : dayEndDate;
               let duration = this.calculateHours(sessionStart, boundEnd);
               if (duration > 0) {
                    totalDuration += duration;
               }
          }

          return totalDuration;
     }


     // async get_breakhours(alldata) {
     //      let i, j, calculateHours, effectiveHours = [], breakentries = [];
     //      let len = alldata.length;
     //      for (i = 0; i < len; i++) {
     //           if (alldata[i].breakcode_uuid != undefined && alldata[i].breakcode_uuid != '') {
     //                breakentries.push(alldata[i]);
     //           }
     //      }

     //      let break_len = breakentries.length;
     //      break_len = break_len / 2;

     //      for (j = 0; j < break_len; j++) {
     //           try {
     //                calculateHours = this.calculateHours(breakentries[j].date, breakentries[j + 1].date, "EH");
     //                effectiveHours.push(calculateHours);
     //           } catch (error: any) {
     //                Logger.error("Error in calculating effective hours", error.message);
     //           }
     //      }
     //      // console.log( effectiveHours );

     //      var diff = effectiveHours.reduce((accumulator, currentValue) => {
     //           return accumulator + currentValue
     //      }, 0);
     //      return diff;

     // }

     async get_breakhours(alldata, dayEnd) {
          let totalDuration = 0;
          let dayEndDate = new Date(dayEnd);

          for (let i = 0; i < alldata.length; i++) {
               let currentEntry = alldata[i];
               let nextEntry = alldata[i + 1];

               if (currentEntry.login_status == 1 && currentEntry.breakcode_uuid) {
                    let breakEnd = (nextEntry && (nextEntry.login_status == 0 || nextEntry.login_status == 2))
                         ? nextEntry.date
                         : dayEndDate;

                    let duration = this.calculateHours(currentEntry.date, breakEnd);
                    if (duration > 0) {
                         totalDuration += duration;
                    }
               }
          }

          return totalDuration;
     }

     async get_non_billable_breakhours(alldata, dayEnd, breakCodeMap: Record<string, string> = {}) {
          let totalDuration = 0;
          let dayEndDate = new Date(dayEnd);

          for (let i = 0; i < alldata.length; i++) {
               let currentEntry = alldata[i];
               let nextEntry = alldata[i + 1];

               if (currentEntry.login_status == 1 && currentEntry.breakcode_uuid) {
                    // billable = "1" means non-billable (needs to be subtracted from gross)
                    if (breakCodeMap[currentEntry.breakcode_uuid] === "1") {
                         let breakEnd = (nextEntry && (nextEntry.login_status == 0 || nextEntry.login_status == 2))
                              ? nextEntry.date
                              : dayEndDate;

                         let duration = this.calculateHours(currentEntry.date, breakEnd);
                         if (duration > 0) {
                              totalDuration += duration;
                         }
                    }
               }
          }

          return totalDuration;

     }

     async get_last_login_date(alldates) {
          let i, logout_len, logout_date, logoutentries = [];
          let len = alldates.length;
          // console.log( len );
          for (i = 0; i < len; i++) {
               if (alldates[i].login_status != "" && alldates[i].login_status == '2') {
                    logoutentries.push(alldates[i])
                    // console.log( alldates[ i ] )
               }
          }

          logout_len = logoutentries.length;
          // console.log( logout_len );
          if (logout_len > 0) {
               logout_date = logoutentries[logout_len - 1].date
          } else {
               logout_date = ''
          }

          return logout_date;

     }

     async exportLoginLogoutWithInfo(queryParams) {
          try {
               const { tenant_uuid, timezone } = queryParams;

               // Get summary data using existing method
               const isAdvanced = Object.keys(queryParams).some(key => key.includes('|'));

               let summaryResponse;
               if (isAdvanced) {
                    let paramsForAdvanced = { ...queryParams };
                    const expectedByAdvancedSearch = new Set(['startDate', 'endDate', 'tenant_uuid', 'role', 'domain', 'timezone', 'limit', 'page']);

                    // Remove any query parameter that is neither expected by advancedSearch nor a piped advanced field
                    Object.keys(paramsForAdvanced).forEach(key => {
                         if (!key.includes('|') && !expectedByAdvancedSearch.has(key)) {
                              delete paramsForAdvanced[key];
                         }
                    });

                    summaryResponse = await this.advancedSearch(paramsForAdvanced);
               } else {
                    summaryResponse = await this.fetchLoginLogoutReportStatistics(queryParams);
               }

               const summaryData = summaryResponse.data || [];

               const exportData = [];

               // For each summary record, fetch detailed information
               for (const summary of summaryData) {
                    const entryParams = {
                         date: summary.date,
                         agent_uuid: summary.agent_uuid
                    };

                    const infoResponse = await this.fetchLoginLogoutEntries(entryParams);
                    const infoData = infoResponse.data || [];

                    if (infoData.length > 0) {
                         // Create separate rows for each information entry
                         infoData.forEach((info: any, index: number) => {
                              exportData.push({
                                   // Summary data
                                   agent_name: summary.agent?.username || "",
                                   fullname: summary.agent?.fullname || "",
                                   date: summary.date,
                                   total_login_hours: summary.total_login_hours,
                                   first_login_time: summary.first_login_time,
                                   last_login_time: summary.last_login_time,
                                   login_count: summary.login_count,
                                   break_count: summary.break_count,
                                   total_break_hours: summary.total_break_hours,
                                   net_login: summary.net_login,

                                   // Information data
                                   info_time_stamp: info.date_time ? moment.tz(info.date_time, timezone).format("HH:mm") : "",
                                   info_event: this.getEventStatus(info),
                                   info_sub_event: this.getSubEventStatus(info),
                                   info_duration: this.getEventDuration(info, index, infoData) || ""
                              });
                         });
                    } else {
                         // If no information data, include summary with empty info fields
                         exportData.push({
                              agent_name: summary.agent?.username || "",
                              fullname: summary.agent?.fullname || "",
                              date: summary.date,
                              total_login_hours: summary.total_login_hours,
                              first_login_time: summary.first_login_time,
                              last_login_time: summary.last_login_time,
                              login_count: summary.login_count,
                              break_count: summary.break_count,
                              total_break_hours: summary.total_break_hours,
                              net_login: summary.net_login,
                              info_time_stamp: "",
                              info_event: "",
                              info_sub_event: "",
                              info_duration: ""
                         });
                    }
               }

               return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, exportData);
          } catch (error: any) {
               Logger.error("Error exporting login logout with information", error.message);
               return this.commonDbFn.sendResponseWithMessage(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed");
          }
     }

     getEventStatus(rowData) {
          if (rowData.login_status === "0" && rowData.breakcode?.length) {
               return `Break End - ${rowData.breakcode[0].name}`;
          } else if (rowData.login_status === "0") {
               return "Login";
          } else if (rowData.login_status === "1" && rowData.breakcode?.length) {
               return `Break Start - ${rowData.breakcode[0].name}`;
          } else if (rowData.login_status === "2") {
               return "Logout";
          }
          return "";
     }

     getSubEventStatus(rowData) {
          if (rowData.login_status === "3") {
               return "Pause End";
          } else if (rowData.login_status === "4") {
               return "Pause Start";
          } else if (rowData.login_status === "5") {
               return "ACW Start";
          } else if (rowData.login_status === "6") {
               return "ACW End";
          }
          return "";
     }

     getDuration(startDate, endDate) {
          if (!startDate || !endDate) return "";

          const date1 = new Date(startDate);
          const date2 = new Date(endDate);
          if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return "";

          const diff = date2.getTime() - date1.getTime();
          if (diff > 60e3) {
               let minutes = Math.floor(diff / 60e3);
               let hours = Math.floor(minutes / 60);
               let remainingMinutes = minutes % 60;

               return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
          }
          return "";
     }

     getEventDuration(rowData, index, infoData) {
          if (
               infoData[index - 1] &&
               rowData.login_status === "0" &&
               rowData.breakcode?.length
          ) {
               return this.getDuration(infoData[index - 1]?.date_time, rowData?.date_time);
          } else if (rowData.login_status === "2") {
               const firstLogin = infoData.find(d => d.login_status === "0" && !d.breakcode?.length);
               const startTime = firstLogin ? firstLogin.date_time : infoData[0]?.date_time;
               return this.getDuration(startTime, rowData?.date_time);
               // return this.getDuration(infoData[0]?.date_time, rowData?.date_time);
          } else if (rowData.login_status === "3") {
               for (let i = index - 1; i >= 0; i--) {
                    if (infoData[i].login_status === "4") {
                         return this.getDuration(infoData[i].date_time, rowData.date_time);
                    }
               }
          } else if (rowData.login_status === "6") {
               for (let i = index - 1; i >= 0; i--) {
                    if (infoData[i].login_status === "5") {
                         return this.getDuration(infoData[i].date_time, rowData.date_time);
                    }
               }
          }
          return "";
     }
}
