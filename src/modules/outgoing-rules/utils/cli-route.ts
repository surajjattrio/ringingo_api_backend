/*
@Usage : CLI based outgoing route (outgoing_rules.route_type = "cli")
         Same logic is implemented in FreeSWITCH lua (scripts/common/cli_route.lua) for manual / ACL calls,
         keep both in sync.

Row fields (outgoing_rules.rules[]) :
  match_cli                : DID numbers, call with any of these CLIs uses this row
  cli_allowed_lengths      : allowed digit lengths of CLI   (empty = any)
  to_allowed_lengths       : allowed digit lengths of To no (empty = any)
  cli_keep_last / cli_prefix , to_keep_last / to_prefix          : format for primary trunk
  trunk_uuid
  failover_trunk_1_uuid / failover_trunk_1_call_id (fixed CLI)
  failover_trunk_1_cli_keep_last / _cli_prefix / _to_keep_last / _to_prefix   (same for failover 2)

Rule field no_cli_mode : "first" (default) | "round_robin"

Flow :
  - CLI given    : first row whose match_cli has this CLI and CLI + To lengths are allowed.
                   No such row -> call fails (CLI not configured).
  - CLI missing  : first row whose To length is allowed and has CLIs with allowed length.
                   first       -> first such CLI of that row
                   round_robin -> CLIs of that row in turn, counter outgoing_rules.cli_rr_counter
                                  (one counter per outgoing rule, shared with FreeSWITCH lua)
*/

export interface CliRouteLeg {
    trunk_uuid: string;
    cli: string;
    to: string;
}

export interface CliRouteResult {
    ok: boolean;
    reason?: string;
    row_index?: number;
    primary?: CliRouteLeg;
    failovers?: CliRouteLeg[];
}

export const isCliRoute = (rule: any) => String(rule?.route_type || "") == "cli";

export const digitsOnly = (value: any) => String(value ?? "").replace(/\D/g, "");

// Keep last N digits (if N set and number is longer) and add prefix
export const formatRouteNumber = (value: any, keepLast: any, prefix: any) => {
    let digits = digitsOnly(value);
    const n = parseInt(String(keepLast ?? ""), 10);
    if (!isNaN(n) && n > 0 && digits.length > n) digits = digits.slice(-n);
    return String(prefix ?? "") + digits;
};

// Same CLI in any format : +917553535469 / 917553535469 / 07553535469 / 7553535469
export const isSameCli = (a: any, b: any) => {
    const x = digitsOnly(a).replace(/^0+/, "");
    const y = digitsOnly(b).replace(/^0+/, "");
    if (!x || !y) return false;
    if (x == y) return true;
    const shorter = x.length < y.length ? x : y;
    const longer = x.length < y.length ? y : x;
    return shorter.length >= 7 && longer.endsWith(shorter);
};

const toList = (value: any): string[] => {
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    return String(value ?? "").split(",").map(v => v.trim()).filter(Boolean);
};

export const isLengthAllowed = (value: any, allowed: any) => {
    const list = toList(allowed);
    if (list.length == 0) return true;
    return list.includes(String(digitsOnly(value).length));
};

const buildLeg = (trunk_uuid: any, cli: any, to: any, row: any, keyPrefix: string): CliRouteLeg => ({
    trunk_uuid: String(trunk_uuid),
    cli: formatRouteNumber(cli, row?.[`${keyPrefix}cli_keep_last`], row?.[`${keyPrefix}cli_prefix`]),
    to: formatRouteNumber(to, row?.[`${keyPrefix}to_keep_last`], row?.[`${keyPrefix}to_prefix`]),
});

const buildRoute = (row: any, rowIndex: number, routeCli: any, toNumber: any): CliRouteResult => {
    const failovers: CliRouteLeg[] = [];
    [1, 2].forEach(n => {
        const trunk = row?.[`failover_trunk_${n}_uuid`];
        if (trunk) failovers.push(buildLeg(trunk, row?.[`failover_trunk_${n}_call_id`] || routeCli, toNumber, row, `failover_trunk_${n}_`));
    });
    return { ok: true, row_index: rowIndex, primary: buildLeg(row.trunk_uuid, routeCli, toNumber, row, ""), failovers };
};

export const isRoundRobinNoCli = (rule: any) => String(rule?.no_cli_mode || "") == "round_robin";

/*
@Param nextRoundRobin : returns next value of rule round robin counter (1, 2, 3 ...), used only when
                        no CLI is given and rule.no_cli_mode = "round_robin"
*/
export const resolveCliRoute = async (rule: any, cli: any, toNumber: any, nextRoundRobin?: () => Promise<number>): Promise<CliRouteResult> => {
    const rows: any[] = Array.isArray(rule?.rules) ? rule.rules : [];
    const hasCli = digitsOnly(cli) != "";

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row?.trunk_uuid) continue;
        if (!isLengthAllowed(toNumber, row?.to_allowed_lengths)) continue;
        const rowClis = toList(row?.match_cli);

        if (hasCli) {
            if (!rowClis.some(rowCli => isSameCli(rowCli, cli))) continue;
            if (!isLengthAllowed(cli, row?.cli_allowed_lengths)) continue;
            return buildRoute(row, i, String(cli), toNumber);
        }

        // No CLI selected : first route having CLIs with allowed length
        const candidates = rowClis.filter(rowCli => isLengthAllowed(rowCli, row?.cli_allowed_lengths));
        if (candidates.length == 0) continue;
        let pick = 0;
        if (isRoundRobinNoCli(rule) && candidates.length > 1 && nextRoundRobin) {
            try {
                const counter = Number(await nextRoundRobin());
                if (counter > 0) pick = (counter - 1) % candidates.length;
            } catch (err) {
                pick = 0;
            }
        }
        return buildRoute(row, i, candidates[pick], toNumber);
    }
    return {
        ok: false,
        reason: hasCli
            ? `CLI ${cli} not configured (or CLI/To length not allowed) in CLI route`
            : `No CLI route row allowed for To number ${toNumber}`,
    };
};

/*
@Usage      : Next round robin counter of outgoing rule (atomic, shared with FreeSWITCH lua)
@Param db   : mongoose connection (any model.db)
*/
export const nextCliRouteRoundRobin = async (db: any, ruleUuid: any): Promise<number> => {
    if (!db || !ruleUuid) return 0;
    const res: any = await db.collection("outgoing_rules").findOneAndUpdate(
        { uuid: String(ruleUuid) },
        { $inc: { cli_rr_counter: 1 } },
        { returnDocument: "after", projection: { cli_rr_counter: 1 } }
    );
    const doc = res && "value" in res ? res.value : res;
    return Number(doc?.cli_rr_counter || 0);
};
