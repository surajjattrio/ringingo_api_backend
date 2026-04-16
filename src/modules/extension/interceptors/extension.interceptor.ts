import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";


export class ExtensionInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        // throw new Error("Method not implemented.");
        // let res = context.switchToHttp().getResponse();
        // console.log(res);
        
        return next.handle().pipe(map(data => ({ 
            
            
            data: data,
            // statusCode: context.switchToHttp().getResponse().statusCode,
            // message: data.message,
            from: "Interceptor" 
        })));

        // return response;
    }
    
}