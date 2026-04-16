import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly microserviceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    // Microservice URL from environment variable
    this.microserviceUrl = this.configService.get<string>("MICRO_SERVICE_RMQ_URL");
    
    if (!this.microserviceUrl) {
      throw new Error("MICRO_SERVICE_RMQ_URL environment variable is required");
    }
    
    this.logger.log(`Using microservice URL: ${this.microserviceUrl}`);
  
  }


async initiateOAuth(body: any): Promise<any> {
  try {
    this.logger.log("Initiating OAuth flow via microservice");

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.microserviceUrl}/api/google-drive/oauth/initiate`,
        body,
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const data = response.data;

    this.logger.log("=== MICROSERVICE RESPONSE ===");
    this.logger.log(JSON.stringify(data, null, 2));
    this.logger.log("============================");

    if (data.success && data.data) {
      const correctCallbackUrl = "urn:ietf:wg:oauth:2.0:oob";

      
      this.logger.log(`Setting callback URL to: ${correctCallbackUrl}`);

      // Update the data with correct URL
      data.data.redirect_uri = correctCallbackUrl;
      this.logger.log(
        `OAuth initiated successfully for tenant: ${body.tenant_uuid}`
      );
    }

    return response.data;
  } catch (error) {
    this.handleError(error, "initiate OAuth");
  }
}

  /**
   * Proxy: Handle OAuth callback from Google
   */
  async handleCallback(code: string, state: string): Promise<any> {
    try {
      this.logger.log("Handling OAuth callback via microservice");
      const callbackUrl = `${this.microserviceUrl}/api/google-drive/oauth/callback`;


      const response = await firstValueFrom(
        this.httpService.get(
         callbackUrl,
          {
            params: { code, state },
          }
        )
      );

      this.logger.log("OAuth callback processed successfully");
      return response.data;
    } catch (error) {
      this.handleError(error, "handle OAuth callback");
    }
  }

  /**
   * Proxy: List Google Drive folders
   */
  async listFolders(state: string): Promise<any> {
    try {
      this.logger.log("Listing folders via microservice");

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.microserviceUrl}/api/google-drive/oauth/folders`,
          {
            params: { state },
          }
        )
      );

      return response.data;
    } catch (error) {
      this.handleError(error, "list folders");
    }
  }

  /**
   * Proxy: Complete OAuth flow after folder selection
   */
  async completeOAuth(body: any): Promise<any> {
    try {
      this.logger.log("Completing OAuth flow via microservice");

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.microserviceUrl}/api/google-drive/oauth/complete`,
          body,
          {
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      this.logger.log(
        `OAuth completed successfully for tenant: ${
          body.tenant_uuid || "unknown"
        }`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "complete OAuth");
    }
  }

  /**
   * Proxy: Check OAuth connection status
   */
  async checkStatus(tenantUuid: string): Promise<any> {
    try {
      this.logger.log(
        `Checking OAuth status for tenant: ${tenantUuid || "global"}`
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.microserviceUrl}/api/google-drive/oauth/status`,
          {
            params: { tenant_uuid: tenantUuid },
          }
        )
      );

      return response.data;
    } catch (error) {
      this.handleError(error, "check OAuth status");
    }
  }

  /**
   * Error handler
   */
  private handleError(error: any, operation: string): never {
    this.logger.error(`Failed to ${operation}`, error.message);

    if (error instanceof AxiosError) {
      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error.response?.data?.message ||
        error.message ||
        `Failed to ${operation}`;

      throw new HttpException(
        {
          success: false,
          message,
          error: error.response?.data?.error || "proxy_error",
        },
        status
      );
    }

    throw new HttpException(
      {
        success: false,
        message: `Failed to ${operation}`,
        error: error.message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  
}
