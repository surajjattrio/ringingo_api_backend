import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import * as fs from "fs";
import * as xml2js from "xml2js";
import * as esl from "modesl";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { CommonFunctions } from "src/modules/common/common_functions";


@Injectable()

export class VoicemailService {
    
  /*
  @Usage : To load voicemail schema and other libraries
  @Param @InjectModel: It will load voicemail schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[voicemail,commonFn,commonDbFn] 
  */
 

  constructor(
  @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
  @InjectModel(ExtensionSchema.name) private readonly extensions: Model<ExtensionDocument>,
  @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
  private readonly commonDbFn: CommonDBFunctions,
  private readonly commonFn: CommonFunctions
  ) { }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of voicemail with data 
  */

  async findAll(queryParams, loggedInUserDetails) {
    let query: any = {};
    let checkRole: any = {};
    const perPage = Number(queryParams.limit) || 10;
    const currentPage = Number(queryParams.page) || 1;
    const skip = perPage * (currentPage - 1);
    let { role, uuid ,username } = loggedInUserDetails;
    let queryResponse = await this.user.find({ user_uuid: uuid }).sort({ _id: -1 }).exec();
    let extension_type: any = "";
 
    if(queryResponse.length > 0 && queryResponse[0].extension_type === "0") {
       extension_type = queryResponse[0].default_extension;
    }

    let queryextensionsResponse = await this.extensions.find({ user_uuid: uuid }).sort({ _id: -1 }).exec();
    if(queryextensionsResponse.length > 0 ){
       username = queryextensionsResponse[0].username;
    }
    let domain
    const tenant = await this.tenant.findOne({ uuid : queryParams.tenant_uuid },{domain :1}).exec();
    if (tenant) {
     domain = (tenant.domain == "" || tenant.domain == null) ? '' : tenant.domain;
    } else {
    Logger.debug(`Tenant not found for user with UUID: ${uuid}`);
    }
    // domain = '';
    let arr = await this.parseXML(queryResponse, domain ,username);
   // console.log("final",arr);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, arr);
}

    /*
    @Usage              : To parse 
    @Param username     : check username
    @Param domain       : check domain
    @Param voicemail    : Voicemail details
    @return Boolean 
    */

parseXML(queryResponse, domain, username) {
    return new Promise(async(resolve, reject) => {
    const arr = [];
    let xml, myResponse = [] , conn , self = this;
    const parser = new xml2js.Parser({ attrkey: "ATTR" });
   // conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
               conn = await self.commonFn.fetchFsConnection();
	       conn.api(`vm_list ${username}@${domain} xml`, function (res) {
		            xml = res.getBody();
			         parser.parseString(xml, function (error, result) {
				                if (error === null) {
					                   const response = result.voicemail?.message || [];
					               if (Array.isArray(response)) {
					                  response.forEach((data) => {
					          let created_epoch = data.created_epoch[0];
				                 const timestamp = created_epoch;
		                    	         const date = new Date(timestamp * 1000);
        		                          let path = data.path[0];
						  let cidName = data['cid-name'][0];
						  let cidNumber = data['cid-number'][0];
						  let messageLen = data['message-len'][0];
               			                  let uuid = data.uuid[0];
                let obj = {
	                  created_epoch: date,
	                    path,
			    cidName,
			    cidNumber,
			    messageLen,
	                    uuid,
	                };
                    arr.push(obj);
              });
              resolve(arr);
            } else {
              console.log('Unexpected response:', response);
              resolve(arr); 
            }
          } else {
                  reject(error);
          }
        });
      });
    //});
  });
}  
    /*
    @Usage         : Delete single or multiple voicemail using uuid
    @Param uuid    : To delete single voicemail pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

/*    async remove(uuid_voicemail: string ,loggedInUserDetails) {
        let logMessages = {
            logErrorMsg: `Voicemail not exist by uuid : ${uuid_voicemail} \n`,
            logSuccessMsg: `Voicemail deleted successfully by uuid : ${uuid_voicemail} \n`
        }
        
    let { uuid ,username ,tenant_uuid} = loggedInUserDetails; 
    let domain
       // domain = '';
    const tenant = await this.tenant.findOne({ uuid : tenant_uuid },{domain :1}).exec();
    if (tenant) {
     domain = (tenant.domain == "" || tenant.domain == null) ? '' : tenant.domain;
    } else {
    Logger.debug(`Tenant not found for user with UUID: ${uuid}`);
    }
      domain = '';
        this.parseDeleteXML(uuid,username,domain);
    }*/

/*    parseDeleteXML(uuid,username,domain) {
	    console.log("del",uuid,username,domain)
        let conn;
        let xml,arr=[];
        const parser = new xml2js.Parser({ attrkey: "ATTR" });
        conn = new esl.Connection(process.env.FS_HOST,process.env.FS_PORT, process.env.FS_PASSWORD, function () {            
	    	conn.api(`vm_delete ${username}@${domain} ${uuid} xml reg`, function (res) {
		console.log(res);
		console.log("OKkk",res.toString().trim());
                   if(res.body.includes("OK")== true){
		console.log("OK",res.toString().trim);
                    return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, "Voicemail deleted successfully by uuid : ${uuid_voicemail} \n");
                   }else{
		   console.log("else")
		   }
		   
                });
        });
        return arr;
    }*/


/*  parseDeleteXML(uuid, username, domain) {
      console.log("del", uuid, username, domain);
      let conn;
      let xml, arr = [];
      const parser = new xml2js.Parser({ attrkey: "ATTR" });
      conn = new esl.Connection(
        process.env.FS_HOST,
        process.env.FS_PORT,
        process.env.FS_PASSWORD,
        () => {
          conn.api(`vm_delete ${username}@${domain} ${uuid} xml reg`, (res) => {
            console.log(res);
            console.log("OKkk",res.getBody().trim());
            if (res.getBody().includes("OK") == true) {
              console.log("OK", res.getBody().trim());
              return this.commonDbFn.sendResponseWithCount(
                HttpStatus.OK,
                `Voicemail deleted successfully by uuid : ${uuid} \n`
              );
            } else {
              console.log("else");
            }
          });
        }
      );
      return arr;
    }*/

async remove(uuid_voicemail: string, loggedInUserDetails) {
  let logMessages = {
    logErrorMsg: `Voicemail does not exist \n`,
    logSuccessMsg: `Voicemail deleted successfully \n`
  };

  let { uuid, username, tenant_uuid } = loggedInUserDetails;
  let domain;

  const tenant = await this.tenant.findOne({ uuid: tenant_uuid }, { domain: 1 }).exec();

  if (tenant) {
     domain = (tenant.domain == "" || tenant.domain == null) ? '' : tenant.domain;
  } else {
    Logger.debug(`Tenant not found for user with UUID: ${uuid}`);
  }

  try {
	 // domain = '';
      await this.parseDeleteXML(uuid_voicemail, username, domain);
    return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, logMessages.logSuccessMsg);
  } catch (error) {
    return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, logMessages.logErrorMsg);
  }
}

parseDeleteXML(uuid: string, username: string, domain: string): Promise<void> {
  return new Promise(async(resolve, reject) => {
   /* const conn = new esl.Connection(
      process.env.FS_HOST,
      process.env.FS_PORT,
      process.env.FS_PASSWORD,
      () => {*/
        let conn,self=this;
        conn = await self.commonFn.fetchFsConnection();
        conn.api(`vm_delete ${username}@${domain} ${uuid}`, (res) => {
          if (res.getBody().includes("OK")) {
            resolve();
          } else {
            reject(new Error("Failed to delete voicemail."));
          }
        });
     // });
  });
}


/** Manish changes for voicemail report 20-06-23 **/

/*async getVoicemailReport(queryParams){
  const { tenant_uuid } = queryParams;
  let populateFields = [{ path: "user", select: "username" }];
  let { domain } = await this.tenant.findOne({ uuid: tenant_uuid }, { domain: 1 }).exec();
  let allTenantExtensions = await this.extensions.find({tenant_uuid},{ username : 1 , _id : 0 , user_uuid : 1}).populate(populateFields).exec();
  let allVoicemails : any = [];
  
  let values,voicemailData:any;
  let allPromise;

  //let myPromise = new Promise(function(myResolve, myReject) {
/* let newData =  allTenantExtensions.map( async (data) => {

     let result = await this.getVoicemails(domain,data.username);
     console.log(result);

     //return result; 
     allVoicemails.push(result);

  });*/
   /*const getData = async function(){
   let data = [];
   for(var i =0 ; i < allTenantExtensions.length; i++){
     let result = await this.getVoicemails(domain,allTenantExtensions[i].username);
     data.push(result);
   }
   return data;
  }*/

 // console.log(await getData());

  // await Promise.all(newData);
   
 //  console.log("AAAA",newData);
   //return allVoicemails;
//}

/*getVoicemails(domain,allTenantExtensions) {
	return new Promise((resolve, reject) => {
		let conn;
		const arr = [];
		let xml, myResponse = [];
		const parser = new xml2js.Parser({ attrkey: "ATTR" });
		conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
		  allTenantExtensions.map( (data) => {	
			conn.api(`vm_list ${data.username}@${domain} xml`, function (res) {
				xml = res?.getBody();
				parser.parseString(xml, function (error, result) {
					if (error === null) {
						const response = result.voicemail?.message || [];
						if (Array.isArray(response)) {
							response.forEach((data) => {
								let created_epoch = data.created_epoch[0];
								const date : any = new Date(created_epoch * 1000);
								let path = data.path[0];
								let cidNumber = data['cid-number'][0];
								let obj = {
									created_epoch: date,
									path,
									cidNumber
								};
								if(date != "" && path != "" && cidNumber !=""){
								  arr.push(obj);
								  resolve(arr);
								}
							});
						//	resolve(arr);
						} else {
							console.log('Unexpected response:', response);
							resolve(arr);
						}
					} else {
						reject(error);
					}
				});
			});

		     });	
		});
	});
}*/


getVoicemails = async (domain, allTenantExtensions) => {
	const promises = allTenantExtensions.map(data => {
		const numFruit = new Promise(async(resolve, reject) => {
			const arr = [];
			let xml,conn,self=this;
			const parser = new xml2js.Parser({ attrkey: "ATTR" });
			//conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
				conn = await self.commonFn.fetchFsConnection();
				conn.api(`vm_list ${data.username}@${domain} xml`, function (res) {
					xml = res?.getBody();
					parser.parseString(xml, function (error, result) {
						if (error === null) {
							const response = result.voicemail?.message || [];
								response.forEach((voicemailData) => {
									let created_epoch = voicemailData.created_epoch[0];
									let date: any = new Date(created_epoch * 1000);
									let iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/)
									date = iso[1] + ' ' + iso[2];
									let path = voicemailData.path[0];
									let cidNumber = voicemailData['cid-number'][0];
									let messageLen = voicemailData['message-len'][0];
									let obj = {
										created_epoch: date,
										path,
										phoneNumber : cidNumber,
										duration : messageLen,
										user : data.user[0].username
									};
									arr.push(obj);
								});
						} else {
							reject(error);
						}
					});
				});

		//	});
			setTimeout( () => resolve(arr),1500 );
		});
		return numFruit;
	});
	return await Promise.all(promises)
}
    


async getVoicemailReport(queryParams){
  const { tenant_uuid , user_uuid } = queryParams;
  let populateFields = [{ path: "user", select: "username" }];
  let tenantDetails = await this.tenant.findOne({ uuid: tenant_uuid }, { domain: 1 }).exec();
  let domain = tenantDetails?.domain;
  //populate(populateFields)
  let allTenantExtensions = await this.extensions.find({tenant_uuid , user_uuid},{ username : 1 , _id : 0 , user_uuid : 1}).populate(populateFields).exec();
  let allVoicemails : any = [];
  let finalArr = []; 
  let values,voicemailData:any;
  let allPromise;
  let result = await this.getVoicemails(domain,allTenantExtensions);
  await result.map((data) =>{
   if(data.length > 0 ){
    allVoicemails.push(...data);

   }
  });
  return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, allVoicemails,allVoicemails.length);

//  console.log("result",result);
  //let finalRes = await Promise.all(result);
  //console.log(finalRes);
  //let myPromise = new Promise(function(myResolve, myReject) {
/* let newData =  allTenantExtensions.map( async (data) => {

     let result = await this.getVoicemails(domain,data.username);
     console.log(result);

     //return result; 
     allVoicemails.push(result);

  });*/
   //  const self = this;
  /*const getData = async function(){
   let data = [];
   for(var i =0 ; i < allTenantExtensions.length; i++){
     let result = await self.getVoicemails(domain,allTenantExtensions[i].username);
     data.push(result);
   }
   return data;
  }
  let res = await Promise.all(await getData());
  //let res = await getData();
  console.log("res",res);
*/
  // await Promise.all(newData);
   
 //  console.log("AAAA",newData);
   //return allVoicemails;
}

}

