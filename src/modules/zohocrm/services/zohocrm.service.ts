import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { postMethod } from "src/global_constant";
import { JWTService } from "src/modules/auth/jwt.service";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { CheckLicenseService } from "src/modules/master-admin/services/check-license.service";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { CountryDocument, CountrySchema } from "src/modules/country/schema/country.schema";


@Injectable()

export class ZohocrmService {

    /*
    @Usage              : To load agent schema and other libraries
    @Param @InjectModel : It will load agent schema
    @Param commonFn     : To use common created function
    @return Object      : [agent,commonFn]
    */

    constructor(
        @InjectModel( UserSchema.name ) private readonly user: Model<UserDocument>,
        @InjectModel( TenantSchema.name ) private readonly tenant: Model<TenantDocument>,
        @InjectModel( ExtensionSchema.name ) private readonly extension: Model<ExtensionDocument>,
        @InjectModel( CdrsSchema.name ) private readonly cdrs: Model<CdrsDocument>,
        @InjectModel( CountrySchema.name ) private readonly country: Model<CountryDocument>,
        private readonly license: CheckLicenseService,
        private readonly commonFn: CommonFunctions,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly jwt: JWTService
    ) { }

    /*
    @Usage          : Login to agent and assing JWT.
    @Param username : Agent username
    @Param password : Agent password
    @return Object  : Success / Error
    */

    async getzohouser ( searchparam ) {
        //console.log(searchparam)
        const { zoho_user_id, tenant_domain } = searchparam
        //console.log( zoho_user_id );
        //console.log( "coming" );
        const tenant = await this.tenant.findOne( { domain: tenant_domain }, { uuid: 1, domain: 1, tenant_name: 1 } ).exec();
        //console.log(tenant);
        const users = await this.user.findOne( { zoho_user_id: zoho_user_id, tenant_uuid: tenant.uuid }, { username: 1, email: 1, password: 1, zoho_user_id: 1, tenant_uuid: 1, default_extension: 1 } ).exec();
        //console.log( users );
        const extension = await this.extension.findOne( { tenant_uuid: users.tenant_uuid, uuid: users.default_extension }, { device_name: 1, username: 1, password: 1, tenant_uuid: 1 } ).exec();
        //console.log( extension );
        // const tenant: any = await this.tenant.findOne( { uuid: users.tenant_uuid }, { tenant_name: 1, username: 1, domain: 1, uuid: 1 } ).populate( [ { path: "roles", select: "-_id" }, { path: "timezone", select: 'timezone_name' } ] ).exec();
        // console.log( tenant );
        const allextension = await this.extension.find( { tenant_uuid: users.tenant_uuid, status: '0' }, { device_name: 1, username: 1, password: 1, tenant_uuid: 1, status: 1 } ).exec();
        //console.log( allextension );

        // const filteredExtensions = allextension.filter((ext) => ext._id.toString() !== extension._id.toString());

        const fieldsToInclude = [ 'device_name', 'username', 'tenant_uuid' ];

        // Filter out extension data from allextension array
        const filteredExtensions = allextension
            .filter( ( ext ) => ext._id.toString() !== extension._id.toString() )
            .map( ( ext ) => {
                // Extract only the specified fields from each element
                const filteredExt = {};
                fieldsToInclude.forEach( ( field ) => {
                    filteredExt[ field ] = ext[ field ];
                } );
                return filteredExt;
            } );

        //console.log( filteredExtensions );

        const countries = await this.country.find( {}, { countrycode: 1 } ).exec();
        console.log( countries );


        let decryptPassword = this.commonFn.decode( extension.password );
        return {
            username: extension.username,
            password: decryptPassword,
            domain: tenant.domain,
            allextension: filteredExtensions,
        };
    }


    async getzohocdrs ( queryParams ) {

        //console.log( "Coming for fetch data" );
        console.log( queryParams );

        let { mobile, phone, tenant_domain } = queryParams;
        let or;
        let tenant_response = await this.tenant.find( { domain: tenant_domain } ).select( 'uuid' ).exec();
        //console.log( tenant_response );
        //console.log( tenant_response[ 0 ].uuid )

        if ( phone && phone.trim() !== '' && mobile && mobile.trim() !== '' ) {
            or = [
                { destination_number: phone },
                { sip_user: phone },
                { destination_number: mobile },
                { sip_user: mobile }
            ]
        } else if ( phone && phone.trim() !== '' && mobile == '' ) {
            or = [
                { destination_number: phone },
                { sip_user: phone }
            ]
        } else if ( mobile && mobile.trim() !== '' && phone == '' ) {
            or = [
                { destination_number: mobile },
                { sip_user: mobile }
            ]
        }
        console.log( or );


        let response = await this.cdrs
            .find( {
                // $or: [
                //     { destination_number: phone },
                //     { sip_user: phone },
                //     { destination_number: mobile },
                //     { sip_user: mobile },
                // ],
                $or: or,
                $and: [
                    { tenant_uuid: tenant_response[ 0 ].uuid }
                ],
                // is_readed: "1",
            } )
            .sort( { callstart: -1 } )
            .limit( 10 )
            .exec();
        // Determining the HTTP status code based on the response length
        let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        // Returning the response along with the status code
        //console.log( "response" );
        //console.log( response );
        return this.commonDbFn.sendResponseWithMessage( statusCode, response );

    }

}





