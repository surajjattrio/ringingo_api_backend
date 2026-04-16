import { DocumentBuilder } from "@nestjs/swagger";

/*
@Usage : To create swagger configuration
@return : It will return document with given configuration
*/
function swaggerConfig() {
    const appName = 'REST APIs';
    const appVersion = '1.0.0';

    const options = new DocumentBuilder()
        .setTitle(appName)
        .setDescription(`The ${appName} description`)
        .setVersion(appVersion)
        .addBearerAuth({
            type: "http",
            name: 'JWT',
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter JWT Token",
            in: "header",
        }, "JWT-auth") // This name here is important for matching up with @ApiBearerAuth() in your controller!
        .build();
    return  options;   
}

export  { swaggerConfig };