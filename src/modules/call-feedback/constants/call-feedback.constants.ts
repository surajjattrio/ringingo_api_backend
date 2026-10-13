// Fixed, non-tenant-configurable feedback flow settings. There is no admin API or DB
// collection for these — change the value here and redeploy. Mirrored in
// ringingo-server-fs/freeswitch/scripts/cdrs/call_feedback.py — keep both in sync.
export const CALL_FEEDBACK_CONSTANTS = {
    RATING_SCALE: "csat_5" as "csat_5" | "nps_11",
    QUESTION_TEXT: "How would you rate your call experience?",
    LANGUAGE: "en",
};
