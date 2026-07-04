export function parseQuestionCustomId(customId: string, expectedPrefix: string): { action: string; projectName?: string; channelId?: string } | null {
    if (!customId.startsWith(expectedPrefix)) return null;

    const parts = customId.split(':');
    const result: any = { action: parts[0] };
    for (let i = 1; i < parts.length; i++) {
        const [k, ...rest] = parts[i].split('=');
        if (k === 'p') result.projectName = rest.join('=');
        else if (k === 'c') result.channelId = rest.join('=');
    }
    return result;
}
