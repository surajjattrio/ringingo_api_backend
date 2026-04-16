import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FtpController } from './controllers/ftp.controller';
import { ftpSchema,FtpSchema } from './schema/ftp.schema';
import { FtpService } from './services/ftp.service';

@Module({
    imports:[MongooseModule.forFeature([ { name : FtpSchema.name , schema : ftpSchema } ])],
    controllers:[FtpController],
    providers:[FtpService],
    exports : [MongooseModule]
})
export class FtpModule {}

