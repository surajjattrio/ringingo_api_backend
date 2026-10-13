import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

/*
@Usage : TokenOrApiKeyAuthGuard only reads the API key from an "x-api-key" HEADER, which a
         plain browser navigation (paste-a-URL-and-hit-enter) can never send. This lets the
         same static key be passed as a query param instead ("?api_key=..."), so the GET
         /ctc/dial URL shown on the CTC page actually works when just opened in a browser tab.
*/
@Injectable()
export class CtcApiKeyQueryMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const queryKey = (req.query?.api_key || req.query?.["x-api-key"]) as string | undefined;
        if (queryKey && !req.headers["authorization"] && !req.headers["x-api-key"]) {
            req.headers["x-api-key"] = queryKey;
        }
        next();
    }
}
