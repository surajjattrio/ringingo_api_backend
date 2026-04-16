import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use ( req: Request, res: Response, next: NextFunction ) {

        const requestUrl = req.originalUrl.split( "/" );
        switch ( req.method ) {
            case "GET":
                if ( requestUrl.length > 2 ) {
                    Logger.debug( `Requested to get single ${req.originalUrl} \n`, `Requested Method : ${req.method}` );
                } else {
                    Logger.debug( `Requested to list all ${req.originalUrl} \n`, `Requested Method : ${req.method}` );
                }
                break;
            case "POST":
                Logger.debug( `Requested to insert data for ${req.originalUrl} : ${JSON.stringify( req.body )} \n`, `Requested Method : ${req.method}` );
                break;

            case "PUT":
                Logger.debug( `Requested to update data for ${req.originalUrl} : ${JSON.stringify( req.body )} \n`, `Requested Method : ${req.method}` );
                break;

            case "PATCH":
                Logger.debug( `Requested to update data for ${req.originalUrl} : ${JSON.stringify( req.body )} \n`, `Requested Method : ${req.method}` );
                break;

            default:
                Logger.debug( `Requested to delete ${req.originalUrl} \n`, `Requested Method : ${req.method}` )
                break;
        }
        next();
    }
}
