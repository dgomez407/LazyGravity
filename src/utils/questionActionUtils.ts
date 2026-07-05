export function parseQuestionCustomId(customId: string, expectedPrefix: string): { action: string; projectName?: string; channelId?: string } | null {
    if (customId !== expectedPrefix && !customId.startsWith(expectedPrefix + ':')) return null;

    const parts = customId.split(':');
    const result: { action: string; projectName?: string; channelId?: string } = { action: parts[0] };
    
    try {
        if (parts.length > 1) {
            result.projectName = decodeURIComponent(parts[1]);
        }
        if (parts.length > 2) {
            result.channelId = decodeURIComponent(parts[2]);
        }
    } catch (e) {
        // Fallback in case of malformed URI component from truncation
        if (parts.length > 1) result.projectName = parts[1];
        if (parts.length > 2) result.channelId = parts[2];
    }
    
    return result;
}
