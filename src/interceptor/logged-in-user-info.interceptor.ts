import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from 'rxjs/operators';
import * as moment from 'moment-timezone';

@Injectable()

/*
@Usage             : To add tenant_uuid,role in request body
@return Object     : After tenant_uuid,role added in request it will pass execution control to requested controller
*/

export class SetUUIDInterceptor implements NestInterceptor {
    public intercept ( _context: ExecutionContext, next: CallHandler ): Observable<any> {

        const request: any = _context.switchToHttp().getRequest();
        const timezone = request?.user?.timezone;
        //const timezone = "Asia/Kolkata";
        if ( request.method == "GET" ) {
            request.query.tenant_uuid = request?.user?.uuid;
            request.query.role = request?.user?.role;
            request.query.uuid = request?.user?.uuid;
            if ( request.query.role == "agent" ) {
                request.query.tenant_uuid = request?.user?.tenant_uuid;
                request.query.uuid = request?.user?.uuid;
                request.query.role = request?.user?.role;
                request.query.domain = request?.user?.domain != undefined ? request?.user?.domain : request?.query?.domain;
		request.query.manager_uuid = request?.user?.manager_uuid;
		request.query.assigned_manager_role = request?.user?.assigned_manager_role;
	//	request.body.manager_uuid = request?.user?.manager_uuid;
            }

            if ( request.url.includes( "/cdrs" ) ) {
                request.query.tableName = "cdrs";
            }

            if ( request.query.role == "manager" ) {
                request.query.tenant_uuid = request?.user?.parent_uuid;
                request.query.manager_uuid = request?.user?.uuid;
                request.query.assigned_manager_role = request?.user?.assigned_manager_role;
                if (!request.url.includes("/activity-log")) {
                    request.query.module = request.route.path.replace(/\//g, "").trim();
                }
		request.query.parent_uuid = request?.user?.parent_uuid;
            }

            request.query.timezone = request?.user?.timezone;
            Logger.debug( `Added extra info in request \n`, `tenant_uuid|role|logged_in_entity_uuid|manager_uuid : ${request.query.tenant_uuid}|${request.query.role}|${request.query.uuid}|${request?.user?.manager_uuid}` );
        }

        if ( request.method == "POST" || request.method == "PUT" || request.method == "DELETE" ) {
            request.body.tenant_uuid = request?.user?.uuid;
            request.body.role = request?.user?.role;
            if ( !request.url.includes( "/trunk" ) ) {
                request.body.domain = request?.user?.domain != undefined ? request?.user?.domain : request?.body?.domain;
            }
            if ( request.body.role == "agent" ) {
                request.body.tenant_uuid = request?.user?.tenant_uuid;
                request.body.uuid = request?.user?.uuid;
                request.body.role = request?.user?.role;
                request.body.domain = request?.user?.domain != undefined ? request?.user?.domain : request?.body?.domain;
                request.body.concurrent_calls = request?.user?.concurrent_calls;
		request.body.manager_uuid = request?.user?.manager_uuid;
		request.body.assigned_manager_role = request?.user?.assigned_manager_role;
            }

            if ( request.body.role == "manager" ) {
                request.body.tenant_uuid = request?.user?.parent_uuid;
                request.body.manager_uuid = request?.user?.uuid;
                request.body.assigned_manager_role = request?.user?.assigned_manager_role;
                request.body.module = request.route.path.replace( /\//g, "" ).trim();
		request.body.parent_uuid = request?.user?.parent_uuid;
            }

            request.body.timezone = request?.user?.timezone;

            Logger.debug( `Added extra info in request \n`, `tenant_uuid|role|domain|logged_in_entity_uuid|manager_uuid : ${request.body.tenant_uuid}|${request.body.role}|${request.body.domain}|${request.body.uuid}|${request?.user?.manager_uuid}` );
        }

        // Modify response of every request
        let finalData, arr = [], obj;
        return next.handle().pipe(
            map( data => {
                if ( Array.isArray( data?.data ) ) {
                    finalData = data?.data;
                    finalData.map( ( newData ) => {
                        if ( (request.body.timezone != undefined || request.query.timezone != undefined) && newData.createdAt ) {
                            newData[ "converted_date" ] = moment( new Date( newData.createdAt ) ).tz( timezone ).format( "YYYY-MM-DD HH:mm:ss" );
                        }
                        arr.push( newData );
                    } );
                } else return data;

                obj = { statusCode: data.statusCode };
                if ( data.count != undefined ) obj[ "count" ] = data.count;
                obj[ "data" ] = arr;
                return obj;
            } )
        );
        //return next.handle();
    }
}

