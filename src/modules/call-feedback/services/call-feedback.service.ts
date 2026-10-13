import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CallFeedbackDocument, CallFeedbackSchema } from "../schema/call-feedback.schema";
import { CallFeedbackLoggingService } from "./call-feedback-logging.service";
import { CALL_FEEDBACK_CONSTANTS } from "../constants/call-feedback.constants";
import { SubmitCallFeedbackDto } from "../dto/submit-call-feedback.dto";

// Note: the SMS send itself does NOT happen here. cdrs_posting.py (ringingo-server-fs)
// creates the call_feedback record and sends the SMS directly in the same process
// (see sms_sender.py there) — no HTTP call into this API for that. This service only
// handles the public token page/submit flow and the debug lookup.
@Injectable()
export class CallFeedbackService {

    constructor(
        @InjectModel(CallFeedbackSchema.name) private readonly feedbackModel: Model<CallFeedbackDocument>,
        private readonly logs: CallFeedbackLoggingService,
    ) { }

    /*
    @Usage : Public token validation — the state machine the /r/[token] page renders off of.
             Order: exists -> not already submitted.
    */
    async getPublicByToken(token: string, meta: { userAgent?: string } = {}) {
        const feedback = await this.feedbackModel.findOne({ token }).exec();
        if (!feedback) {
            return { state: "not_found" as const };
        }

        if (feedback.status === "submitted") {
            return { state: "already_submitted" as const };
        }

        if (!feedback.openedAt) {
            feedback.openedAt = new Date();
            feedback.userAgent = (meta.userAgent || "").toString();
            if (feedback.status === "sent") feedback.status = "opened";
            await feedback.save();
        }

        return {
            state: "ok" as const,
            token,
            ratingScale: CALL_FEEDBACK_CONSTANTS.RATING_SCALE,
            questionText: CALL_FEEDBACK_CONSTANTS.QUESTION_TEXT,
        };
    }

    /*
    @Usage : Submit — one-shot. Once status is "submitted" it's locked, no edits.
             Rate limiting is handled at the controller (per token/IP).
    */
    async submitByToken(token: string, dto: SubmitCallFeedbackDto, meta: { userAgent?: string }) {
        const feedback = await this.feedbackModel.findOne({ token }).exec();
        if (!feedback) {
            return { statusCode: HttpStatus.NOT_FOUND, message: "Not found" };
        }

        if (feedback.status === "submitted") {
            return { statusCode: HttpStatus.CONFLICT, message: "Feedback already submitted" };
        }

        const maxRating = CALL_FEEDBACK_CONSTANTS.RATING_SCALE === "nps_11" ? 10 : 5;
        const rating = Number(dto.rating);
        if (!Number.isFinite(rating) || rating < 0 || rating > maxRating) {
            return { statusCode: HttpStatus.BAD_REQUEST, message: "Invalid rating" };
        }

        const comment = (dto.comment || "").toString().slice(0, 500).trim();

        feedback.formData = { rating, comment };
        feedback.status = "submitted";
        feedback.submittedAt = new Date();
        feedback.userAgent = (meta.userAgent || "").toString();
        await feedback.save();

        return { statusCode: HttpStatus.OK, message: "Thank you for your feedback" };
    }

    /*
    @Usage : Debug endpoint backing query — the feedback record plus its full log timeline,
             looked up by whichever identifier is supplied.
    */
    async debug(tenantUuid: string, query: { callUuid?: string; token?: string }) {
        const filter: any = { tenantUuid };
        if (query.callUuid) filter.callUuid = query.callUuid;
        else if (query.token) filter.token = query.token;
        else return { statusCode: HttpStatus.BAD_REQUEST, message: "callUuid or token is required" };

        const feedback = await this.feedbackModel.findOne(filter).exec();
        if (!feedback) {
            return { statusCode: HttpStatus.NOT_FOUND, message: "No feedback record found" };
        }

        const timeline = await this.logs.findTimeline(tenantUuid, feedback.uuid.toString());
        return { statusCode: HttpStatus.OK, data: { feedback, timeline } };
    }
}
