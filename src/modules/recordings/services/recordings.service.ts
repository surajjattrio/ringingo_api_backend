import { Injectable, Logger, HttpStatus } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { RecordingsDocument, RecordingsSchema } from "../schema/recordings.schema";

import { TenantDocument, TenantSchema } from "../../tenant/schema/tenant.schema";
import * as moment from 'moment-timezone';
import { ObjectId } from 'mongodb';
import { exec } from 'child_process';
import * as fs from "fs";
import * as archiver from "archiver";
import { Response } from "express";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

@Injectable()

export class RecordingsService {

    constructor(
        @InjectModel(RecordingsSchema.name) private readonly recordings: Model<RecordingsDocument>,
        @InjectModel(TenantSchema.name) private readonly tenants: Model<TenantDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly httpService: HttpService,
    ) { }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of roles with data
    */

    async findAll(queryParams) {
        let populateFields = [{ path: "user", select: "username fullname" }];
        let searchFields = ["caller_id_number", "caller_id_name", "callstart", "destination_number"];
        queryParams.tableName = "recording";
        return this.commonDbFn.findAllWithPagination(this.recordings, queryParams, searchFields, populateFields);
    }

    /*
    @Usage              : To search recordings using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of recordings with data
    */

    /*advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.recordings, searchParams);
    }*/

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "user", select: "username fullname" }];
        let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where = [], key, obj, result, count = 0;

        //Check Role type
        let { role, tenant_uuid, uuid } = searchParams;
        if (role == "tenant") {
            where.push({ tenant_uuid: tenant_uuid });
        } else if (role == "agent") {
            where.push({ user_uuid: uuid });
        }
        //Delete unnecessary details from request
        delete searchParams.tenant_uuid;
        delete searchParams.role;
        delete searchParams.domain;
        delete searchParams.uuid;

        if (searchParams.callstart != undefined && searchParams.callend != undefined) {
            obj = { "callstart": { "$gte": `${searchParams.callstart}`, "$lte": `${searchParams.callend}` } };
            where.push(obj);
        }

        //Pagination
        const perPage = Number(searchParams.limit) || 10;
        const currentPage = Number(searchParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        //End

        delete searchParams.limit;
        delete searchParams.page;
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
                searchFlag = parseInt(filedName.split("|")[1].trim());
            } else {
                key = filedName;
                searchFlag = -1;
            }

            switch (searchFlag) {
                case 1: //Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);
                    break;
                case 2: // Contains
                    obj = { [key]: { $regex: filedValue, $options: "i" } };
                    where.push(obj);
                    break;
                case 3: // Does not contains
                    obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                    where.push(obj);
                    break;
                case 4: // Is equal to
                    obj = { [key]: filedValue };
                    where.push(obj);
                    break;
                case 5: // In not equal to
                    obj = { [key]: { $ne: filedValue } };
                    where.push(obj);
                    break;
                case 6: //Ends with
                    obj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
                    where.push(obj);
                    break;

                default: //Begins with
                    obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
                    where.push(obj);
                    break;
            }
        }

        if (searchParams.campaign_uuid != undefined) {
            obj = { "campaign_uuid": searchParams.campaign_uuid }
            where.push(obj);
        }

        result = await this.recordings.find({ $and: where }).populate(populateFields).sort({ _id: -1 }).skip(skip).limit(perPage).exec();

        if (result.length > 0) {
            count = await this.recordings.find({ $and: where }).count().exec();
            Logger.debug(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
        } else {
            Logger.error(count, "Search result count");
            return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
        }
    }

    /*
    @Usage                  : Upload tenant recordings on UP-CLOUD server using shell-script
    @Param  execute time    : Every day at night 2AM
    @return Object          : Success / Error
    */

    async uploadTenantRecordings() {
        Logger.log(`Upload Tenant Recordings triggered !!!`);

        try {
            let searchFields = ["domain", "username", "tenant_name"];
            let populateFields = [{ path: "roles", select: "role_name" }, { path: "country", select: 'country nicename' }, { path: "timezone", select: 'timezone_name gmttime' }, { path: "outgoing_rule", select: 'name -_id -uuid' }];

            await this.commonDbFn.findAllWithPagination(this.tenants, {}, searchFields, populateFields).then(async (tenats) => {

                if (tenats && tenats.data && tenats.data.length > 0) {
                    Logger.log(`Tenants ==> ${JSON.stringify(tenats.data.length)}`);

                    for (const tenat of tenats.data) {
                        // console.log( 'One Tenant ==> ', tenat );

                        //  Where clause and populate field and date setting
                        let populateFields = [{ path: "user", select: "username fullname" }];
                        let whereClause: any = [];

                        let currentDate = new Date();
                        let ninetyDaysAgo: any = new Date().setDate(currentDate.getDate() - 90);
                        const startOfDay = new Date(ninetyDaysAgo.getFullYear(), ninetyDaysAgo.getMonth(), ninetyDaysAgo.getDate(), 0, 0, 1);
                        const endOfDay = new Date(ninetyDaysAgo.getFullYear(), ninetyDaysAgo.getMonth(), ninetyDaysAgo.getDate(), 23, 59, 59);

                        whereClause.push({
                            _id: {
                                $gte: new ObjectId(Math.floor(startOfDay.getTime() / 1000).toString(16) + '0000000000000000'),
                                $lt: new ObjectId(Math.floor(endOfDay.getTime() / 1000).toString(16) + '0000000000000000')
                            },
                            tenant_uuid: tenat.uuid,
                            is_uploaded: false
                        });
                        // Logger.debug( JSON.stringify( whereClause ), "Recording whereClause ==> " );

                        //  Pagination
                        let perPage = Number(process.env.RECORDING_LIMIT_PER_PAGE);
                        let count = await this.recordings.find({ $and: whereClause }).count().exec();
                        Logger.debug(count, "Recording total count ==> ");

                        if (count > 0) {
                            let loopCounter = Math.ceil(count / perPage);
                            Logger.debug(loopCounter, "Recording For loop counter ==> ");

                            for (let index = 0, cpIndex = 1; index <= loopCounter; index++, cpIndex++) {
                                setTimeout(() => { }, 1500);

                                let currentPage = cpIndex;
                                Logger.debug(currentPage, `Recording - currentPage ==> `);

                                let skip = perPage * (currentPage - 1);
                                Logger.debug(skip, `Recording - skip ==> `);

                                let recordings: any = await this.recordings.find({ $and: whereClause }).limit(perPage).skip(skip).populate(populateFields).exec();
                                // Logger.log( `RECORDING - result ==> ${JSON.stringify( recordings )}` );

                                if (recordings.length > 0) {
                                    Logger.debug(recordings.length, `RECORDING - result.length ==> `);

                                    recordings.forEach(async (recording: any) => {
                                        // console.log( "recording ==> ", recording );

                                        let tenantUUID = tenat.uuid;
                                        let tenantName = tenat.tenant_name;
                                        let recordingPath = recording.recording_path;
                                        let recordingDate = moment(recording.callstart, "YYYYMMDD").format();

                                        // Shell script
                                        await this.executeShellScriptCommand(tenantUUID, tenantName, recordingPath, recordingDate);

                                        // Update field
                                        this.recordings.findOneAndUpdate(
                                            { _id: recording._id },
                                            { $set: { is_uploaded: true } },
                                            { new: false }
                                        );
                                    });
                                }
                            }
                        }
                    }
                }
            }).catch((error) => {
                Logger.error(`Upload Tenant Recordings - Catch block ==> Unable get tenant ==> `, error.message);
            });
        } catch (error) {
            Logger.error(`Upload Tenant Recordings - Catch found ==> Unable get tenant ==> `, error.message);
        }
    }

    /*
    @Usage                  : Execute shell command
    @Param  execute time    : Tenant UUID, Tenant name, Recording path, Recording date
    @return Object          : Success / Error
    */
    async executeShellScriptCommand(tenantUUID: any, tenantName: any, recordingPath: any, recordingDate: any): Promise<string> {
        Logger.log(`Execute Shell Script Command triggered !!!`);

        return new Promise((resolve, reject) => {
            try {
                let command = `cd /opt/caching/bucket/ && ./final.sh ${recordingDate} ${tenantName} ${recordingPath}`;
                Logger.log(`COMMAND ==> ${command}`);


                //////// NOTE - NEED TO UNCOMMENT FOLLOWING CODE
                // exec( command, ( error, stdout, stderr ) => {
                //     if ( error ) {
                //         //   console.error(`Error executing command: ${error.message}`);
                //         Logger.error( `Upload Tenant Recordings - Error executing command ==> `, error.message );
                //         return reject( error );
                //     }

                //     if ( stderr ) {
                //         //   console.error(`Command stderr: ${stderr}`);
                //         Logger.error( `Upload Tenant Recordings - STD Error executing command ==> `, stderr );
                //         return reject( stderr );
                //     }

                //     Logger.log( `RECORDING - Command output ==> ${stdout}` );
                //     resolve( stdout );
                // } );

            } catch (error) {
                Logger.error(`CATCH FOUND - Upload Tenant Recordings - Error executing command ==> `, error.message);
                return reject(error);

            }
        });
    }


    /*
@Usage        : Download all recordings of a given date as ZIP
@Method       : GET
@Param date   : YYYY-MM-DD
@Return       : ZIP file
*/
    async downloadByAdvancedSearch(searchParams, res: Response) {
        Logger.log(`Advanced Search ZIP Download triggered`);

        try {
            let populateFields = [{ path: "user", select: "username fullname" }];
            let where: any[] = [];
            let obj, key, searchFlag;

            // Role-based access
            let { role, tenant_uuid, uuid } = searchParams;

            if (role === "tenant") {
                where.push({ tenant_uuid: tenant_uuid });
            } else if (role === "agent") {
                where.push({ user_uuid: uuid });
            }

            delete searchParams.role;
            delete searchParams.tenant_uuid;
            delete searchParams.uuid;
            delete searchParams.domain;

            // Date range
            if (searchParams.callstart && searchParams.callend) {
                obj = {
                    callstart: {
                        $gte: `${searchParams.callstart}`,
                        $lte: `${searchParams.callend}`
                    }
                };
                where.push(obj);
            }

            delete searchParams.callstart;
            delete searchParams.callend;

            // Handle other fields
            const keys = Object.keys(searchParams);
            const values = Object.values(searchParams);

            for (let i = 0; i < keys.length; i++) {
                let fieldName = keys[i];
                let fieldValue = values[i];

                if (fieldName.includes("|")) {
                    key = fieldName.split("|")[0].trim();
                    searchFlag = parseInt(fieldName.split("|")[1].trim());
                } else {
                    key = fieldName;
                    searchFlag = -1;
                }

                switch (searchFlag) {
                    case 1: obj = { [key]: { $regex: `^${fieldValue}`, $options: "i" } }; break;
                    case 2: obj = { [key]: { $regex: fieldValue, $options: "i" } }; break;
                    case 3: obj = { [key]: { $regex: `^((?!${fieldValue}).)*$`, $options: "i" } }; break;
                    case 4: obj = { [key]: fieldValue }; break;
                    case 5: obj = { [key]: { $ne: fieldValue } }; break;
                    case 6: obj = { [key]: { $regex: `${fieldValue}$`, $options: "i" } }; break;
                    default: obj = { [key]: { $regex: `^${fieldValue}`, $options: "i" } }; break;
                }

                where.push(obj);
            }

            // Special campaign filter
            if (searchParams.campaign_uuid !== undefined) {
                where.push({ campaign_uuid: searchParams.campaign_uuid });
            }

            Logger.debug(JSON.stringify(where), "Final Filter");

            // Fetch all matching recordings
            const recordings = await this.recordings
                .find({ $and: where })
                .populate(populateFields)
                .sort({ _id: -1 })
                .exec();

            if (!recordings.length) {
                Logger.error(`No recordings found`);
                return res.status(HttpStatus.NOT_FOUND).json({
                    message: "No recordings found"
                });
            }
            Logger.log(`Found ${recordings.length} recordings.`);

            // Prepare ZIP
            const zipFileName = `recordings-filter.zip`;

            res.set({
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename=${zipFileName}`
            });

            const archive = archiver("zip", { zlib: { level: 9 } });
            archive.pipe(res);

            // Add files to ZIP
            for (const rec of recordings) {
                const filePath = rec.recording_path?.toString();

                if (!filePath) {
                    Logger.error(`File missing: ${filePath}`);
                    continue;
                }

                let fileName = filePath.split("/").pop();
                const number = rec?.direction === 'outbound' ? rec?.destination_number : rec?.caller_id_number;
                if (number) {
                    fileName = `${number}_${fileName}`;
                }

                if (/^https?:\/\//i.test(filePath)) {
                    try {
                        const response = await firstValueFrom(
                            this.httpService.get(filePath, { responseType: "stream" })
                        );
                        archive.append(response.data, { name: fileName });
                        Logger.debug(`Adding (remote): ${fileName}`);
                    } catch (err: any) {
                        Logger.error(`Failed to fetch remote recording ${filePath}: ${err.message}`);
                    }
                } else if (fs.existsSync(filePath)) {
                    Logger.debug(`Adding: ${fileName}`);
                    archive.file(filePath, { name: fileName });
                } else {
                    Logger.error(`File missing: ${filePath}`);
                }
            }

            await archive.finalize();
            Logger.log(`ZIP generated successfully`);

        } catch (error) {
            Logger.error(`Error creating ZIP: ${error.message}`);
            return res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ message: "Internal Server Error" });
        }
    }
}
