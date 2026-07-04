export function parseQuestionCustomId(customId: string, expectedPrefix: string): { action: string; projectName?: string; channelId?: string } | null {
    if (!customId.startsWith(expectedPrefix)) return null;

    const parts = customId.split(':');
    const result: { action: string; projectName?: string; channelId?: string } = { action: parts[0] };
    if (parts.length > 1) {
        result.projectName = parts[1];
    }
    if (parts.length > 2) {
        result.channelId = parts[2];
    }
    return result;
}
