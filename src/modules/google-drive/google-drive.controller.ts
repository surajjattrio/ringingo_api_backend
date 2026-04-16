import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { GoogleDriveService } from './google-drive.service';
import { InitiateOAuthDto } from './dto/initiate-oauth.dto';
import { CompleteOAuthDto } from './dto/complete-oauth.dto';
import { Public } from 'src/global_constant';


@Controller('')
export class GoogleDriveController {
  private readonly logger = new Logger(GoogleDriveController.name);

  constructor(private readonly googleDriveService: GoogleDriveService) { }

  /**
   * @route   POST /api/google-drive/oauth/initiate
   * @desc    Initiate OAuth flow (proxies to microservice)
   * @access  Private
   */
  @Post('oauth/initiate')
  async initiateOAuth(@Body() initiateOAuthDto: InitiateOAuthDto) {
    this.logger.log('POST /oauth/initiate - Initiating OAuth flow');
    return this.googleDriveService.initiateOAuth(initiateOAuthDto);
  }

  @Public()
  @Get('oauth/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    this.logger.log('=== NESTJS CALLBACK START ===');
    this.logger.log(`Code: ${code?.substring(0, 20)}...`);
    this.logger.log(`State: ${state?.substring(0, 30)}...`);
    this.logger.log(`Time: ${new Date().toISOString()}`);

    try {
      if (error) {
        this.logger.error(`OAuth error from Google: ${error}`);
        return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Failed</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Authorization Failed</h2>
          <p>Error: ${error}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_ERROR', 
                error: '${error}' 
              }, window.location.origin);
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
        </html>
      `);
      }

      if (!code || !state) {
        this.logger.error('Missing code or state');
        return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Request</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Invalid Request</h2>
          <p>Missing required parameters</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_ERROR', 
                error: 'missing_parameters' 
              }, window.location.origin);
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
        </html>
      `);
      }

      this.logger.log('Calling microservice callback...');

      // Call microservice
      const result = await this.googleDriveService.handleCallback(code, state);

      this.logger.log('✅ Microservice responded successfully');
      this.logger.log(`Result: ${JSON.stringify(result)}`);

      return res.redirect("urn:ietf:wg:oauth:2.0:oob");

    } catch (error) {
      this.logger.error('❌ Callback handling failed');
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);

      return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Error</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h2>❌ Connection Failed</h2>
        <p>${error.message}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'OAUTH_ERROR', 
              error: 'callback_failed',
              message: '${error.message}' 
            }, window.location.origin);
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body>
      </html>
    `);
    }
  }


  /**
   * @route   GET /api/google-drive/oauth/folders
   * @desc    List Google Drive folders
   * @access  Private
   */
  @Get('oauth/folders')
  async listFolders(@Query('state') state: string) {
    this.logger.log('GET /oauth/folders - Listing folders');

    if (!state) {
      return {
        success: false,
        message: 'state parameter is required',
      };
    }

    return this.googleDriveService.listFolders(state);
  }

  /**
   * @route   POST /api/google-drive/oauth/complete
   * @desc    Complete OAuth flow after folder selection
   * @access  Private
   */
  @Post('oauth/complete')
  async completeOAuth(@Body() completeOAuthDto: CompleteOAuthDto) {
    this.logger.log('POST /oauth/complete - Completing OAuth flow');
    return this.googleDriveService.completeOAuth(completeOAuthDto);
  }

  /**
   * @route   GET /api/google-drive/oauth/status
   * @desc    Check OAuth connection status
   * @access  Private
   */
  @Get('oauth/status')
  async checkStatus(@Query('tenant_uuid') tenantUuid: string) {
    this.logger.log(
      `GET /oauth/status - Checking status for tenant: ${tenantUuid || 'global'}`,
    );

    if (!tenantUuid) {
      return {
        success: false,
        message: 'tenant_uuid is required',
      };
    }

    return this.googleDriveService.checkStatus(tenantUuid);
  }
}