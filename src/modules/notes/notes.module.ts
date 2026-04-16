import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotesController } from './controllers/notes.controller';
import { notesSchema, NotesSchema } from './schema/notes.schema';
import { NotesService } from './services/notes.service';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';


@Module({
    imports:[MongooseModule.forFeature([ { name : NotesSchema.name , schema : notesSchema } , { name : CdrsSchema.name , schema : cdrsSchema } ])],
    controllers:[NotesController],
    providers:[NotesService],
    exports : [MongooseModule]
})
export class NotesModule {}
