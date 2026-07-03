import type { PlatformSelectInteraction } from '../platform/types';
import type { SelectAction } from './selectHandler';
import type { CdpBridge } from '../services/cdpBridgeManager';
import type { WorkspaceCommandHandler } from '../commands/workspaceCommandHandler';
import { logger } from '../utils/logger';
import { QUESTION_SELECT_ACTION_PREFIX } from '../services/notificationSender';

export interface QuestionSelectActionDeps {
    readonly bridge: CdpBridge;
    readonly wsHandler: WorkspaceCommandHandler;
}

export function parseQuestionCustomId(customId: string): { action: string; projectName?: string; channelId?: string } | null {
    if (!customId.startsWith(QUESTION_SELECT_ACTION_PREFIX)) return null;

    const parts = customId.split(':');
    const result: any = { action: parts[0] };
    for (let i = 1; i < parts.length; i++) {
        const [k, ...rest] = parts[i].split('=');
        if (k === 'p') result.projectName = rest.join('=');
        else if (k === 'c') result.channelId = rest.join('=');
    }
    return result;
}

export function createQuestionSelectAction(deps: QuestionSelectActionDeps): SelectAction {
    return {
        match(customId: string): boolean {
            return customId.startsWith(QUESTION_SELECT_ACTION_PREFIX);
        },

        async execute(
            interaction: PlatformSelectInteraction,
            values: readonly string[],
        ): Promise<void> {
            const parsed = parseQuestionCustomId(interaction.customId);
            if (!parsed) return;

            const selectedOption = parseInt(values[0], 10);
            if (isNaN(selectedOption)) return;

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
            logger.debug(`[QuestionSelectAction] project=${projectName ?? 'null'} channel=${interaction.channel.id}`);

            const detector = projectName
                ? deps.bridge.pool.getQuestionDetector(projectName)
                : undefined;

            if (!detector) {
                logger.warn(`[QuestionSelectAction] No detector for project=${projectName}`);
                await interaction
                    .reply({ text: 'Question detector not found.', ephemeral: true })
                    .catch(() => {});
                return;
            }

            await interaction.deferUpdate().catch(() => {});

            let success = false;
            try {
                success = await detector.submitOption(selectedOption);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.error(`[QuestionSelectAction] CDP click failed: ${msg}`);
                await interaction
                    .followUp({ text: `Failed to answer question: ${msg}`, ephemeral: true })
                    .catch(() => {});
                return;
            }

            if (success) {
                const updatePayload = { text: `✅ Submitted option ${selectedOption + 1}`, components: [] as any[] };
                try {
                    await interaction.editReply(updatePayload);
                } catch (editErr) {
                    logger.warn('[QuestionSelectAction] editReply failed, sending followUp:', editErr);
                    await interaction.followUp({ text: `✅ Submitted option ${selectedOption + 1}` }).catch(() => {});
                }
            } else {
                await interaction
                    .followUp({ text: 'Failed to answer question (it may have been resolved already).', ephemeral: true })
                    .catch(() => {});
            }
        },
    };
}
