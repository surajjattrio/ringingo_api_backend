import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { LicenseDocument, LicenseSchema } from "../schema/license.schema";
import { Model } from "mongoose";
import { CommonFunctions } from "src/modules/common/common_functions";
import * as bcrypt from 'bcrypt';

@Injectable()

export class CheckLicenseService {

    /*
    @Usage              : To load license schema and other libraries
    @Param @InjectModel : It will load license schema
    @Param commonFn     : To use common created function
    @return Object      : [license,commonFn]
    */

    constructor(
        @InjectModel( LicenseSchema.name ) private license: Model<LicenseDocument>,
        private readonly commonFn: CommonFunctions
    ) { }

    /*
    @Usage              : To check license exist or not
    @return Object
    */

    async checkLicenseExist () {
        try {
            let result = await this.license.find().exec();
            return result.length == 0 ? false : await this.commonFn.decode( result[ 0 ].key_details );
        } catch ( error ) {
            Logger.error( `Error in catch block ==> checkLicenseExist()`, error.message );
        }
    }

    /*
    @Usage              : To add WHMCS license details
    @Param              : whmcs license details
    @return Object      : Success / Error
    */

    async addLicense ( response ) {
        try {
            let encryptResponse = await this.commonFn.encode( JSON.stringify( response ) );
            await this.removeLicense();
            // Adding Seats information to the response
            let seats = 0;
            let customFields = response.customfields.split( '|' );
            for ( let field of customFields ) {
                let [ key, value ] = field.split( '=' );
                if ( key.trim() === 'Seats' ) {
                    seats = parseInt( value );
                    response.Seats = seats;
                    break;
                }
            }
            const result = new this.license( { key_details: encryptResponse, seats: response.Seats } );
            return result.save();
        } catch ( error ) {
            Logger.error( `Error in adding license ==> addLicense()`, error.message );
            return [];
        }
    }

    /*
    @Usage              : To delete  WHMCS license details
    @return Object      : Success / Error
    */

    async removeLicense () {
        try {
            let result = await this.license.deleteMany( {} );
            console.log( "Result", result );
        } catch ( error ) {
            Logger.error( `Error in catch block ==> removeLicense()`, error.message );
        }
    }

}
