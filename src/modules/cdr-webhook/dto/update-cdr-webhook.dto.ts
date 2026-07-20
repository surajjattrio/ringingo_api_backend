import { PartialType } from "@nestjs/swagger";
import { CreateCdrWebhookDto } from "./create-cdr-webhook.dto";

export class UpdateCdrWebhookDto extends PartialType(CreateCdrWebhookDto) { }
