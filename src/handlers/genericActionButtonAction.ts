import type { ButtonAction } from './buttonHandler';
import type { CdpBridge } from '../services/cdpBridgeManager';
import { getCurrentCdp } from '../services/cdpBridgeManager';
import { logger } from '../utils/logger';

import type { WorkspaceCommandHandler } from '../commands/workspaceCommandHandler';
import { buildClickScript } from '../services/approvalDetector';

export interface GenericActionButtonActionDeps {
    readonly bridge: CdpBridge;
    readonly wsHandler: WorkspaceCommandHandler;
}

/**
 * Parses a generic action button customId into its components.
 * Format: action_btn_[action_name]:[project_name]:[channel_id]
 *
 * @param customId The customId to parse
 * @returns Parsed action details, or null if not an action button
 */
export function parseGenericActionCustomId(customId: string) {
    if (!customId.startsWith('action_btn_')) return null;
    const parts = customId.split(':');
    const actionName = parts[0].replace('action_btn_', '').replace(/_/g, ' ');
    // Capitalize first letter
    const formattedName = actionName.charAt(0).toUpperCase() + actionName.slice(1);
    return {
        actionName: formattedName,
        projectName: parts[1] || undefined,
        channelId: parts[2] || undefined,
    };
}

export function createGenericActionButtonAction(deps: GenericActionButtonActionDeps): ButtonAction {
    return {
        match(customId: string): Record<string, string> | null {
            const parsed = parseGenericActionCustomId(customId);
            if (!parsed) return null;
            const result: Record<string, string> = { actionName: parsed.actionName };
            if (parsed.projectName) result.projectName = parsed.projectName;
            if (parsed.channelId) result.channelId = parsed.channelId;
            return result;
        },

        async execute(interaction, params): Promise<void> {
            const actionName = params.actionName;
            const channelId = params.channelId || interaction.channel?.id;
            
            let projectName: string | undefined = params.projectName;
            if (!projectName && channelId) {
                const workspacePath = deps.wsHandler.getWorkspaceForChannel(channelId);
                projectName = workspacePath ? deps.bridge.pool.extractProjectName(workspacePath) : undefined;
            }

            await interaction.deferUpdate();

            const cdp = projectName 
                ? deps.bridge.pool.getConnected(projectName)
                : getCurrentCdp(deps.bridge);
                
            if (!cdp) {
                await interaction.followUp({
                    text: 'Not connected to Antigravity. Send the action as a message instead.',
                }).catch(() => {});
                return;
            }

            // Simulate DOM click instead of chat injection
            logger.info(`[GenericActionButton] Clicking action button "${actionName}" via DOM script`);
            const script = buildClickScript(actionName);
            const evalResult = await cdp.call('Runtime.evaluate', {
                expression: script,
                returnByValue: true,
            });

            const resultValue = evalResult.result?.value;
            if (!resultValue?.ok) {
                await interaction.followUp({
                    text: `Failed to execute action: Button "${actionName}" not found or obscured.`,
                }).catch(() => {});
                return;
            }
        },
    };
}
