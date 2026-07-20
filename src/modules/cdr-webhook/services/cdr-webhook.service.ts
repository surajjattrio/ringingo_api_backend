import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosError } from "axios";
import { firstValueFrom } from "rxjs";

@Injectable()
export class CdrWebhookService {
    private readonly logger = new Logger(CdrWebhookService.name);
    private readonly cdrServiceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.cdrServiceUrl = this.configService.get<string>("CDR_SERVICE_URL");

        if (!this.cdrServiceUrl) {
            throw new Error("CDR_SERVICE_URL environment variable is required");
        }

        this.logger.log(`Using CDR service URL: ${this.cdrServiceUrl}`);
    }

    async list(query: any, tenantUuid: string) {
        // tenant_uuid always comes from the JWT-derived param, never from the client
        // query string — spreading it last prevents a caller from overriding it.
        const params = { ...query, tenant_uuid: tenantUuid };
        const response = await this.request("get", "/api/webhooks", { params }, "list webhooks");
        return { statusCode: HttpStatus.OK, count: response.data?.count, data: response.data?.data };
    }

    async getOne(id: string) {
        const response = await this.request("get", `/api/webhooks/${id}`, {}, "fetch webhook");
        return { statusCode: HttpStatus.OK, data: response.data?.data };
    }

    async create(body: any) {
        const response = await this.request("post", "/api/webhooks", { data: body }, "create webhook");
        return { statusCode: HttpStatus.CREATED, data: response.data?.data, message: response.data?.message };
    }

    async update(id: string, body: any) {
        const response = await this.request("put", `/api/webhooks/${id}`, { data: body }, "update webhook");
        return { statusCode: HttpStatus.OK, message: response.data?.message };
    }

    async remove(id: string) {
        const response = await this.request("delete", `/api/webhooks/${id}`, {}, "delete webhook");
        return { statusCode: HttpStatus.OK, message: response.data?.message };
    }

    async test(id: string, body: any) {
        const response = await this.request("post", `/api/webhooks/${id}/test`, { data: body }, "test webhook");
        return { statusCode: HttpStatus.OK, data: response.data };
    }

    async logs(query: any, tenantUuid: string) {
        // tenant_uuid always comes from the JWT-derived param, never from the client
        // query string — spreading it last prevents a caller from overriding it.
        const params = { ...query, tenant_uuid: tenantUuid };
        const response = await this.request("get", "/api/webhook-logs", { params }, "fetch webhook logs");
        return { statusCode: HttpStatus.OK, count: response.data?.total ?? response.data?.count, data: response.data?.data };
    }

    async stats() {
        const response = await this.request("get", "/api/webhooks-stats", {}, "fetch webhook stats");
        return { statusCode: HttpStatus.OK, data: response.data?.data };
    }

    /**
     * Builds the complete URL including the query string axios would actually send
     * (axios's own `params` option never shows up in `url` itself), purely for
     * logging/error messages — the real request still passes `params` separately so
     * axios handles encoding.
     */
    private buildFullUrl(url: string, params?: Record<string, any>): string {
        if (!params) return url;

        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, String(value));
            }
        });

        const queryString = query.toString();
        return queryString ? `${url}?${queryString}` : url;
    }

    /**
     * Builds a copy-pasteable curl command for the exact outbound request — same
     * convention as the [WEBHOOK_CURL] log in ringingo-fs-cdr's webhook-manager.js.
     * Lets you reproduce/replay the exact request hitting the CDR microservice
     * without digging through axios internals.
     */
    private buildCurlCommand(method: string, fullUrl: string, data?: any): string {
        const dataFlag = data !== undefined ? ` -d '${JSON.stringify(data)}'` : "";
        return `curl -X ${method.toUpperCase()} '${fullUrl}' -H 'Content-Type: application/json'${dataFlag}`;
    }

    private async request(method: "get" | "post" | "put" | "delete", path: string, options: { params?: any; data?: any }, operation: string) {
        const url = `${this.cdrServiceUrl}${path}`;
        const fullUrl = this.buildFullUrl(url, options.params);
        const curlCommand = this.buildCurlCommand(method, fullUrl, options.data);

        this.logger.log(`${operation} -> ${method.toUpperCase()} ${fullUrl}`);
        this.logger.debug(`[CDR_PROXY_CURL] Copy and test manually: ${curlCommand}`);

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    method,
                    url,
                    params: options.params,
                    data: options.data,
                    headers: { "Content-Type": "application/json" }
                })
            );

            this.logger.log(`${operation} <- ${method.toUpperCase()} ${fullUrl} (${response.status})`);

            return response;
        } catch (error) {
            this.handleError(error, operation, method, fullUrl);
        }
    }

    private handleError(error: any, operation: string, method: string, url: string): never {
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const upstreamBody = error.response?.data;

            this.logger.error(
                `Failed to ${operation} — ${method.toUpperCase()} ${url} -> ${status ?? error.code ?? "no response"
                }: ${typeof upstreamBody === "string" ? upstreamBody : JSON.stringify(upstreamBody)}`
            );

            if (!error.response) {
                // Request never reached ringingo-fs-cdr (connection refused/timeout/DNS) — CDR_SERVICE_URL is likely unreachable.
                throw new HttpException(
                    {
                        success: false,
                        message: `Could not reach CDR service at ${url} (${error.code || error.message}). Check that ringingo-fs-cdr is running and CDR_SERVICE_URL is correct.`,
                        error: "cdr_service_unreachable"
                    },
                    HttpStatus.BAD_GATEWAY
                );
            }

            const message =
                upstreamBody?.error ||
                upstreamBody?.message ||
                (typeof upstreamBody === "string" && upstreamBody) ||
                `${method.toUpperCase()} ${url} responded with ${status}`;

            throw new HttpException(
                {
                    success: false,
                    message,
                    error: upstreamBody?.error || "proxy_error",
                    upstreamUrl: url
                },
                status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        this.logger.error(`Failed to ${operation} — ${method.toUpperCase()} ${url}: ${error.message}`);

        throw new HttpException(
            {
                success: false,
                message: `Failed to ${operation}: ${error.message}`,
                error: error.message
            },
            HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
