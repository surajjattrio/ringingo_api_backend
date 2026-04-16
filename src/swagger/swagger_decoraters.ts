import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiUnauthorizedResponse } from "@nestjs/swagger";

/*
@Usage : Swagger description
@Param 1 : At success response, which message will be displayed in swagger.
@Param 2 : Short description what API will do and which message will be displayed in swagger.
*/
export function loginDecoraters(apiOkResponseValue) {   
    return applyDecorators(
        ApiConsumes("application/x-www-form-urlencoded"),
        ApiOkResponse({ description:  apiOkResponseValue }),
        ApiNotFoundResponse({ description: "The server cannot find the requested resource" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"})
    )
}
export function postDecoraters(apiOkResponseValue,apiOperation) {
    
    return applyDecorators(
        ApiCreatedResponse({ description: apiOkResponseValue }),
        ApiOperation({ summary: apiOperation }),
        ApiBadRequestResponse({ description: "The request sent to the server is invalid or corrupted" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"}),
        ApiBearerAuth('JWT-auth'),
        ApiConsumes("application/x-www-form-urlencoded"),
    )
}

export function getDecoraters(apiOkResponseValue,apiOperation) {
    
    return applyDecorators(
        ApiOkResponse({ description:  apiOkResponseValue}),
        ApiOperation({ summary: apiOperation }),
        ApiNotFoundResponse({ description: "The server cannot find the requested resource" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"}),
        ApiBearerAuth('JWT-auth'),
        ApiConsumes("application/x-www-form-urlencoded")

    )
}

export function putDecoraters(apiOkResponseValue,apiOperation) {
    
    return applyDecorators(
        ApiOkResponse({ description:  apiOkResponseValue}),
        ApiOperation({ summary: apiOperation }),
        commonDecorator()
    )
}

export function deleteDecoraters(apiOkResponseValue,apiOperation) {
    
    return applyDecorators(
        ApiOkResponse({ description:  apiOkResponseValue}),
        ApiOperation({ summary: apiOperation }),
        commonDecorator()
    )
}

export function jsonDecorator(apiOkResponseValue,apiOperation) {
    
    return applyDecorators(
        ApiCreatedResponse({ description: apiOkResponseValue }),
        ApiOperation({ summary: apiOperation }),
        ApiBadRequestResponse({ description: "The request sent to the server is invalid or corrupted" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"}),
        ApiBearerAuth('JWT-auth')
    )
}


export function fileDecorator(apiOkResponseValue,apiOperation) {
    return applyDecorators(
        ApiCreatedResponse({ description: apiOkResponseValue }),
        ApiOperation({ summary: apiOperation }),
        ApiBadRequestResponse({ description: "The request sent to the server is invalid or corrupted" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"}),
        ApiBearerAuth('JWT-auth'),
        ApiConsumes("multipart/form-data")
    )
}

export function putFileDecorator(apiOkResponseValue,apiOperation) {
    return applyDecorators(
        ApiOkResponse({ description: apiOkResponseValue }),
        ApiOperation({ summary: apiOperation }),
        ApiBadRequestResponse({ description: "The request sent to the server is invalid or corrupted" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"}),
        ApiBearerAuth('JWT-auth'),
        ApiConsumes("multipart/form-data")
    )
}

function commonDecorator(){
    return applyDecorators(
        ApiConsumes("application/x-www-form-urlencoded"),
        ApiNotFoundResponse({ description: "The server cannot find the requested resource" }),
        ApiBadRequestResponse({ description: "The request sent to the server is invalid or corrupted" }),
        ApiUnauthorizedResponse({ description: "Unauthorized" }),
        ApiInternalServerErrorResponse({description : "The server encountered an unexpected condition that prevented it from fulfilling the request"}),
        ApiBearerAuth('JWT-auth')
    )
}