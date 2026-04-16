import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ActivityLogService } from "../modules/activity-log/services/activity-log.service";
import axios from "axios";

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(private readonly activityLogService: ActivityLogService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, user, headers } = request;

        // Skip GET requests and login paths to avoid logging sensitive credentials early
        if (method === "GET" || url.includes("/advanced-search") || url.includes("/export-csv") || url.includes("/login")) {
            return next.handle();
        }

        const ip = headers["x-forwarded-for"] || request.connection.remoteAddress;
        const userAgent = headers["user-agent"] || "";

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    const status_code = context.switchToHttp().getResponse().statusCode;

                    // Basic masking for sensitive data
                    const sanitizedPayload = { ...body };
                    const sensitiveFields = ["password", "token", "secret", "confirm_password"];
                    sensitiveFields.forEach(field => {
                        if (sanitizedPayload[field]) sanitizedPayload[field] = "********";
                    });

                    let location = "-";
                    let coordinates = "";

                    const geoLat = headers['x-geo-lat'];
                    const geoLng = headers['x-geo-lng'];

                    if (geoLat && geoLng) {
                        coordinates = `${geoLat}, ${geoLng}`;
                        try {
                            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${geoLat}&lon=${geoLng}`;
                            // User-Agent is required by Nominatim usage policy
                            const geoResponse = await axios.get(nominatimUrl, {
                                headers: { 'User-Agent': 'Ringingo-ActivityLog/1.0' }
                            });

                            if (geoResponse.data && geoResponse.data.display_name) {
                                location = geoResponse.data.display_name;
                            }
                        } catch (error) {
                            Logger.warn(`Geocoding failed for ${coordinates}: ${error.message}`);
                        }
                    }

                    const logData = {
                        user_uuid: user?.uuid || "anonymous",
                        tenant_uuid: user?.tenant_uuid || user?.parent_uuid || body?.tenant_uuid || user?.uuid || null,
                        campaign_uuid: body?.campaign_uuid || user?.campaign_uuid || null,
                        role: user?.role || "guest",
                        module: this.extractModule(url),
                        action: this.determineAction(method, url),
                        method,
                        url,
                        payload: sanitizedPayload,
                        response: response,
                        ip_address: ip,
                        browser: this.parseBrowser(userAgent),
                        location: location,
                        coordinates: coordinates,
                        status_code,
                    };

                    // Asynchronously save log
                    this.activityLogService.createLog(logData);
                } catch (error) {
                    Logger.error("ActivityLogInterceptor Error:", error);
                }
            })
        );
    }

    private extractModule(url: string): string {
        const parts = url.split("/");
        return parts[1] || "unknown";
    }

    private determineAction(method: string, url: string): string {
        const module = this.extractModule(url).toUpperCase();
        switch (method) {
            case "POST": return `CREATE_${module}`;
            case "PUT":
            case "PATCH": return `UPDATE_${module}`;
            case "DELETE": return `DELETE_${module}`;
            default: return `${method}_${module}`;
        }
    }

    private parseBrowser(ua: string): string {
        // Check for specific browsers first (most specific to least specific)
        if (ua.includes("Edg")) return "Edge"; // Must come before Chrome
        if (ua.includes("OPR") || ua.includes("Opera")) return "Opera"; // Must come before Chrome
        if (ua.includes("SamsungBrowser")) return "Samsung Browser"; // Must come before Chrome
        if (ua.includes("Chrome")) return "Chrome"; // Check after Edge, Opera, Samsung
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari"; // Safari check must be last
        if (ua.includes("Trident") || ua.includes("MSIE")) return "Internet Explorer";
        return "Unknown";
    }
}
