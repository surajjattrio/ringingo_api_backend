import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

/*
@Usage : Correlates every log line/event emitted while handling one voice-broadcast "flow" — a single HTTP
         request (create/update/resetLeads/queueNewLeadForBroadcast) or a single cron-fired dial session
         (initiateBroadcastCalls + its recursive startSendingCalls chain) — under one run_id, without having
         to thread the id through every function signature. Propagates automatically through async/await,
         Promises and setTimeout, including recursive self-calls, as long as the flow starts inside runWithVoiceBroadcastLogContext().
*/

export interface VoiceBroadcastLogContext {
    run_id: string;
    tenant_uuid?: string;
    voice_broadcast_uuid?: string;
    lead_management_uuid?: string;
}

const storage = new AsyncLocalStorage<VoiceBroadcastLogContext>();

export function runWithVoiceBroadcastLogContext<T> ( context: Partial<VoiceBroadcastLogContext>, fn: () => T ): T {
    const ctx: VoiceBroadcastLogContext = { run_id: context.run_id || randomUUID(), ...context };
    return storage.run( ctx, fn );
}

export function getVoiceBroadcastLogContext (): Partial<VoiceBroadcastLogContext> {
    return storage.getStore() || {};
}
