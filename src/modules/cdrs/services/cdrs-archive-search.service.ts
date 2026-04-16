import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class CDRSArchieveSearchService {
    private client: MongoClient;
    private db: Db;
    private DBName = process.env.MONGO_DB;

    constructor() {
        this.client = new MongoClient( process.env.MONGO_URI );
        this.connect();
    }

    /*
   @Usage          : Connect MONGO client
   @Method         : GET
   @return         : Array of an object with total count of archived CDRs depend on quarter
   */
    private async connect () {
        try {
            await this.client.connect();
            this.db = this.client.db( this.DBName );
            Logger.log( 'CDRS-ARCHIVE-SERVICE-SEARCH - Connected to MongoDB !!!' );
        } catch ( error ) {
            throw new Error( `CDRS-ARCHIVE-SERVICE-SEARCH-MONGO-CLIENT - CATCH found ==> ${error}` );
        }
    }

    /*
   @Usage          : Archieve search count
   @Method         : GET
   @return         : Array of an object with total count of archived CDRs depend on quarter
   */
    async cdrsArchiveSearchCount ( collectionName: string, whereClause: any = {} ) {
        try {
            const collection = this.db.collection( collectionName );
            let result = collection.count( { $and: whereClause } );
            return result;
        } catch ( error ) {
            throw new Error( `CDRS-ARCHIVE-SERVICE-SEARCH-COUNT - CATCH found ==> ${error}` );
        }
    }

    /*
   @Usage          : Archieve search data
   @Method         : GET
   @return         : Array of an object with total count of archived CDRs depend on quarter
   */

    async cdrsArchiveSearchData ( collectionName: string, whereClause: any = {}, perPage: number, skip: number ) {
        try {
            const collection = this.db.collection( collectionName );
            let result = collection.find( { $and: whereClause } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).toArray();
            return result;
        } catch ( error ) {
            throw new Error( `CDRS-ARCHIVE-SERVICE-SEARCH-DATA - CATCH found ==> ${error}` );
        }
    }

    /*
    @Usage                 : To create DB collection dynaically
    @Param collection_name : schema[tableName]
    @Param logMessage      : Object with error & success message
    @return Object         : Name of last created collection
    */

    async createCollection ( collection_name: string ) {
        try {
            if ( this.db.collection( collection_name ) && this.db.collection( collection_name ) !== null && this.db.collection( collection_name ) !== undefined ) {
                Logger.debug( collection_name, "DB collection is already exist" );
                return this.db.collection( collection_name );
            } else {
                await this.db.createCollection( collection_name );
                Logger.debug( collection_name, "DB collection is created" );
                return this.db.collection( collection_name );
            }
        } catch ( error ) {
            Logger.error( "DB collection not created" );

            return null;
        }
    }

    /*
    @Usage                 : To get DB collection dynaically
    @Param collection_name : schema[tableName]
    @Param logMessage      : Object with error & success message
    @return Object         : Name of created collection object
    */

    async getCollectionObject ( collection_name: string ) {
        try {
            if ( this.db.collection( collection_name ) && this.db.collection( collection_name ) !== null && this.db.collection( collection_name ) !== undefined ) {
                return this.db.collection( collection_name );
            } else {
                return null;
            }
        } catch ( error ) {
            Logger.error( "DB collection not found" );
            return null;
        }
    }

    /*
    @Usage                 : To drop DB collection dynaically
    @Param collection_name : schema[tableName]
    @Param logMessage      : Object with error & success message
    @return                : TRUE/FALSE
     
    */

    async dropCollection ( collection_name: string ) {
        try {
            if ( await this.db.dropCollection( collection_name ) ) {
                Logger.debug( collection_name, "DB collection is deleted" );
                return true;
            } else {
                return false;
            }
        } catch ( error ) {
            Logger.error( "DB collection not deleted" );

            return false;
        }
    }

    /*
    @Usage                 : To close mongo client connection
    @return                : TRUE/FALSE
     
    */

    async closeMongoClientConnection () {
        try {
            await this.client.close();
            Logger.log( "Mongo client DB collection is closed" );

            return true;
        } catch ( error ) {
            Logger.error( "Mongo client DB collection not closed" );

            return null;
        }
    }
}
