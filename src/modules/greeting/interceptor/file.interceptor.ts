import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class FileExtender implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        req.file['name'] = req.body.name;
        req.file['user_uuid'] = req.body.user_uuid;
        req.file['tenant_uuid'] = req.body.tenant_uuid;
        req.file['file'] = req.file.originalname;
        return next.handle();
    }
}