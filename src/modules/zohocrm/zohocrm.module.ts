import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantModule } from '../tenant/tenant.module';
import { MasterAdminModule } from "../master-admin/master-admin.module";
import { UserSchema, userSchema } from '../user/schema/user.schema';
import { ExtensionSchema, extensionSchema } from '../extension/schema/extension.schema';
import { ZohocrmController } from '../zohocrm/controllers/zohocrm.controller';
import { ZohocrmService } from '../zohocrm/services/zohocrm.service';
import { CdrsSchema, cdrsSchema } from '../cdrs/schema/cdrs.schema';
import { CountrySchema, countrySchema } from '../country/schema/country.schema';




@Module({
    imports:[MongooseModule.forFeature([ 
	    { name : UserSchema.name , schema : userSchema } ,
	    { name: ExtensionSchema.name, schema: extensionSchema },
        {name:CdrsSchema.name,schema:cdrsSchema},
        { name: CountrySchema.name, schema: countrySchema }
    ]),TenantModule,MasterAdminModule],
    controllers:[ZohocrmController],
    providers : [ZohocrmService]
})
export class ZohocrmModule {}



