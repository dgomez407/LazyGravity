import type { PlatformButtonInteraction } from '../platform/types';
import type { ButtonAction } from './buttonHandler';
import type { CdpBridge } from '../services/cdpBridgeManager';
import type { WorkspaceCommandHandler } from '../commands/workspaceCommandHandler';
import { logger } from '../utils/logger';
import { QUESTION_SKIP_ACTION_PREFIX } from '../services/notificationSender';

export interface QuestionSkipActionDeps {
    readonly bridge: CdpBridge;
    readonly wsHandler: WorkspaceCommandHandler;
}

export function parseQuestionSkipCustomId(customId: string): { action: string; projectName?: string; channelId?: string } | null {
    if (!customId.startsWith(QUESTION_SKIP_ACTION_PREFIX)) return null;

    const parts = customId.split(':');
    const result: any = { action: parts[0] };
    for (let i = 1; i < parts.length; i++) {
        const [k, ...rest] = parts[i].split('=');
        if (k === 'p') result.projectName = rest.join('=');
        else if (k === 'c') result.channelId = rest.join('=');
    }
    return result;
}

export function createQuestionSkipAction(deps: QuestionSkipActionDeps): ButtonAction {
    return {
        match(customId: string): Record<string, string> | null {
            const parsed = parseQuestionSkipCustomId(customId);
            return parsed ? { action: parsed.action } : null;
        },

        async execute(
            interaction: PlatformButtonInteraction,
            params: Record<string, string>,
        ): Promise<void> {
            const parsed = parseQuestionSkipCustomId(interaction.customId);
            if (!parsed) return;

            const channelId = parsed.channelId;
            if (channelId && channelId !== interaction.channel.id) {
                await interaction
                    .reply({ text: 'This question is linked to a different session channel.', ephemeral: true })
                    .catch(() => {});
                return;
            }

            let projectName: string | undefined = parsed.projectName;
            if (!projectName) {
                const workspacePath = deps.wsHandler.getWorkspaceForChannel(interaction.channel.id);
                projectName = workspacePath ? deps.bridge.pool.extractProjectName(workspacePath) : undefined;
            }
            logger.debug(`[QuestionSkipAction] project=${projectName ?? 'null'} channel=${interaction.channel.id}`);

            const detector = projectName
                ? deps.bridge.pool.getQuestionDetector(projectName)
                : undefined;

            if (!detector) {
                logger.warn(`[QuestionSkipAction] No detector for project=${projectName}`);
                await interaction
                    .reply({ text: 'Question detector not found.', ephemeral: true })
                    .catch(() => {});
                return;
            }

            await interaction.deferUpdate().catch(() => {});

            let success = false;
            try {
                success = await detector.skipQuestion();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`[QuestionSkipAction] CDP click failed: ${msg}`);
                await interaction
                    .followUp({ text: `Failed to skip question: ${msg}`, ephemeral: true })
                    .catch(() => {});
                return;
            }

            if (success) {
                const updatePayload = { text: `✅ Skipped question`, components: [] as any[] };
                try {
                    await interaction.editReply(updatePayload);
                } catch (editErr) {
                    logger.warn('[QuestionSkipAction] editReply failed, sending followUp:', editErr);
                    await interaction.followUp({ text: `✅ Skipped question` }).catch(() => {});
                }
            } else {
                await interaction
                    .followUp({ text: 'Failed to skip question (it may have been resolved already).', ephemeral: true })
                    .catch(() => {});
            }
        },
    };
}
