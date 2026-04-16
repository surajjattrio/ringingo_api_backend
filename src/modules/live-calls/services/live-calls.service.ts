import { HttpStatus, Injectable } from "@nestjs/common";
import * as xml2js from "xml2js";
import * as esl from "modesl";
import { CommonDBFunctions} from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";

@Injectable()

export class LiveCallsService {

    constructor(
        private readonly commonDbFn: CommonDBFunctions,
	private readonly commonFn: CommonFunctions
    ) { }

    /*
    @Usage             : To get live calls 
    @Param queryParams : It will contain logged in user info
    @return Object     : Array of an object with total count of live calls with data 
    */

    async getLiveCalls(queryParams) {
        let tenant, trunk, obj, liveCallsArr = [], presenceData, user, loggedInUserUUID
        let callsData = await this.parseXML(queryParams);
        let timestamp = Date.now();
        // timestamp in seconds
        timestamp = Math.floor(timestamp / 1000);
        let data = callsData["result"]["row"];
        data?.map(async (item, i) => {

            presenceData = item.presence_data[0].split(",");

            loggedInUserUUID = presenceData[0] != undefined ? presenceData[0].split("=")[1] : "";
            if (queryParams.tenant_uuid == loggedInUserUUID && queryParams.role !== "master_admin") {
		 
                tenant = presenceData[1] != undefined ? presenceData[1].split("=")[1] : "";
                trunk = presenceData[2] != undefined ? presenceData[2].split("=")[1] : "";
                user = presenceData[3] != undefined ? presenceData[3].split("=")[1] : "";

                obj = {
                    date: item.created[0],
                    tenant,
                    callerIdName: item.cid_name[0],
                    callerIdNumber: item.cid_num[0],
                    destinationNumber: item.dest[0],
                    duration: timestamp - item.created_epoch[0],
                    type: item.direction[0],
                    trunk,
                    user,
                    status: item.callstate[0],
		    uuid : item.uuid[0]
                }
                liveCallsArr.push(obj);
            }

            //For Admin
            if (queryParams.role == "master_admin") {
                tenant = presenceData[1] != undefined ? presenceData[1].split("=")[1] : "";
                trunk = presenceData[2] != undefined ? presenceData[2].split("=")[1] : "";
                user = presenceData[3] != undefined ? presenceData[3].split("=")[1] : "";

                obj = {
                    date: item.created[0],
                    tenant,
                    callerIdName: item.cid_name[0],
                    callerIdNumber: item.cid_num[0],
                    destinationNumber: item.dest[0],
                    duration: timestamp - item.created_epoch[0],
                    type: item.direction[0],
                    trunk,
                    user,
                    status: item.callstate[0]
                }
                liveCallsArr.push(obj);
            }
        })
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, liveCallsArr, liveCallsArr.length)
    }

    async parseXML(queryParams) {
        let conn, xml, self=this;
        const parser = new xml2js.Parser({ attrkey: "ATTR" });
        return new Promise(async function (resolve, reject) {
            //conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
		conn = await self.commonFn.fetchFsConnection();
                conn.api(`show calls as xml`, function (res) {
                    xml = res.getBody();
                    parser.parseString(xml, function (err, result) {
                        if (err === null) {
                            resolve(result);
                        } else {
                            reject(err);
                            console.log(err, "Error in live calls");
                        }
                    })
                })
            //})
        });
    }
}
