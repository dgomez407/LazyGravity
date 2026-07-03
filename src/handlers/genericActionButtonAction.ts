import type { ButtonAction } from './buttonHandler';
import type { CdpBridge } from '../services/cdpBridgeManager';
import { getCurrentCdp } from '../services/cdpBridgeManager';
import { logger } from '../utils/logger';

export interface GenericActionButtonActionDeps {
    readonly bridge: CdpBridge;
}

export function createGenericActionButtonAction(deps: GenericActionButtonActionDeps): ButtonAction {
    return {
        match(customId: string): Record<string, string> | null {
            if (!customId.startsWith('action_btn_')) return null;
            const actionName = customId.replace('action_btn_', '').replace(/_/g, ' ');
            // Capitalize first letter
            const formattedName = actionName.charAt(0).toUpperCase() + actionName.slice(1);
            return { actionName: formattedName };
        },

        async execute(interaction, params): Promise<void> {
            const actionName = params.actionName;

            await interaction.deferUpdate();

            const cdp = getCurrentCdp(deps.bridge);
            if (!cdp) {
                await interaction.followUp({
                    text: 'Not connected to Antigravity. Send the action as a message instead.',
                }).catch(() => {});
                return;
            }

            // Inject the action text
            logger.info(`[GenericActionButton] Clicking action button "${actionName}" via chat injection`);
            const result = await cdp.injectMessage(actionName);
            if (!result.ok) {
                await interaction.followUp({
                    text: `Failed to execute action: ${result.error}`,
                }).catch(() => {});
                return;
            }
        },
    };
}
