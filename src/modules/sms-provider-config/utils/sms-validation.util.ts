// GSM 03.38 default alphabet (basic table only — extension-table characters like `{`, `}`, `[`, `]`,
// `~`, `|`, `€` each cost 2 chars and are treated here as regular single-width chars, which is a
// conservative approximation for the purpose of a save-time single-segment check).
const GSM7_CHARSET = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[\]~|€]*$/;

export const GSM7_SINGLE_SEGMENT_LIMIT = 160;
export const UCS2_SINGLE_SEGMENT_LIMIT = 70;

export function isGsm7(text: string): boolean {
    return GSM7_CHARSET.test(text || "");
}

// Reports whether `text` fits in a single SMS segment, given its own charset (GSM-7 vs UCS-2).
export function fitsSingleSegment(text: string): boolean {
    const value = text || "";
    const limit = isGsm7(value) ? GSM7_SINGLE_SEGMENT_LIMIT : UCS2_SINGLE_SEGMENT_LIMIT;
    return value.length <= limit;
}

const DOT_PATH_PATTERN = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;

export function isParseableDotPath(path: string): boolean {
    return typeof path === "string" && path.length > 0 && DOT_PATH_PATTERN.test(path);
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

// Collects every `{{placeholder}}` name used anywhere inside a (possibly nested) template object.
export function extractPlaceholders(template: any): string[] {
    if (template === undefined || template === null) return [];
    const serialized = typeof template === "string" ? template : JSON.stringify(template);
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    PLACEHOLDER_PATTERN.lastIndex = 0;
    while ((match = PLACEHOLDER_PATTERN.exec(serialized)) !== null) {
        found.add(match[1]);
    }
    return Array.from(found);
}

export const RESERVED_BODY_TEMPLATE_PLACEHOLDERS = ["to", "senderId", "templateId"];

/*
@Usage : Every {{placeholder}} in bodyTemplate must be one of the fixed reserved names or one
         of the config's own declared variables — otherwise the request would go out with
         an unresolved {{...}} in it at send time.
@return : Array of placeholder names that are not accounted for (empty = valid)
*/
export function findUnresolvedBodyTemplatePlaceholders(bodyTemplate: any, variables: string[]): string[] {
    const declared = new Set([...RESERVED_BODY_TEMPLATE_PLACEHOLDERS, ...(variables || [])]);
    return extractPlaceholders(bodyTemplate).filter((name) => !declared.has(name));
}

/*
@Usage : Renders a DLT template body (with `{#var#}` placeholders) using the longest sample
         value we can reasonably assume per variable, purely to check it still fits one SMS
         segment — the actual per-send values aren't known at save time.
*/
export function renderTemplateForLengthCheck(body: string, variables: string[], sampleValueLength = 15): string {
    let rendered = body || "";
    for (const variable of variables || []) {
        rendered = rendered.split(`{#${variable}#}`).join("x".repeat(sampleValueLength));
    }
    return rendered;
}
