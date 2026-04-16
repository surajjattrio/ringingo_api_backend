import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { CreateNotesDto } from "../dto/create-notes.dto";
import { NotesService } from "../services/notes.service";

@Controller("notes")

/*@Usage : To provide title of API in swagger */
@ApiTags("Notes")

export class NotesController {

    /*
    @Usage  : To load notes and other libraries
    @return : Object[notes] 
    */

    constructor(private readonly notes: NotesService) { }

    @Post()
    @postDecoraters("Note created successfully", "Create a new note")

    /*
    @Usage                          : To create new note
    @Method                         : POST
    @Param cdrs_uuid                : string
    @Param lead_uuid                : string
    @Param comment                  : string[Default 0]
    @return success object          : Note created successfully
    */

    create(@Body() createNotesDto: CreateNotesDto) {
        return this.notes.create(createNotesDto);
    }

    @Get()
    @getDecoraters("Retrieved all notes successfully", "List all notes")

    /*
    @Usage  : List all notes
    @Method : GET
    @return : Array of an object with total count of notes with data
    */

    findAll(@Query() queryParam) {
        return this.notes.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single tenant successfully", "List single tenant using uuid")

    /*
    @Usage               : List single notes using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid notes
    */

    findOne(@Param('uuid') id: string , @Query() queryParam) {
        return this.notes.findOne(id,queryParam);
    }
}

