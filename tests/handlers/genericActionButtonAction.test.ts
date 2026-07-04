import { createGenericActionButtonAction } from '../../src/handlers/genericActionButtonAction';
import type { CdpBridge } from '../../src/services/cdpBridgeManager';
import { getCurrentCdp } from '../../src/services/cdpBridgeManager';
import { CdpService } from '../../src/services/cdpService';

jest.mock('../../src/services/cdpBridgeManager');
jest.mock('../../src/services/cdpService');

describe('genericActionButtonAction', () => {
    let mockBridge: jest.Mocked<CdpBridge>;
    let mockCdp: jest.Mocked<CdpService>;

    beforeEach(() => {
        mockCdp = {} as any;
        mockCdp.call = jest.fn().mockResolvedValue({ result: { value: { ok: true } } });

        mockBridge = {} as any;
        (getCurrentCdp as jest.Mock).mockReturnValue(mockCdp);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('matches customIds starting with action_btn_', () => {
        const mockWsHandler = { getWorkspaceForChannel: jest.fn() } as any;
        const handler = createGenericActionButtonAction({ bridge: mockBridge, wsHandler: mockWsHandler });
        expect(handler.match('action_btn_proceed')).toEqual({ actionName: 'Proceed' });
        expect(handler.match('action_btn_review_plan')).toEqual({ actionName: 'Review plan' });
        expect(handler.match('other_btn')).toBe(null);
    });

    it('clicks formatted action button via DOM script', async () => {
        const mockWsHandler = { getWorkspaceForChannel: jest.fn() } as any;
        const handler = createGenericActionButtonAction({ bridge: mockBridge, wsHandler: mockWsHandler });
        const deferUpdate = jest.fn().mockResolvedValue(undefined);
        
        await handler.execute({
            customId: 'action_btn_review_plan',
            channelId: 'ch-1',
            userId: 'u-1',
            message: {} as any,
            deferUpdate,
        } as any, { actionName: 'Review plan' });

        expect(getCurrentCdp).toHaveBeenCalledWith(mockBridge);
        expect(deferUpdate).toHaveBeenCalled();
        expect(mockCdp.call).toHaveBeenCalledWith('Runtime.evaluate', expect.objectContaining({
            expression: expect.stringContaining('Review plan')
        }));
    });

    it('shows error if CDP is not connected', async () => {
        (getCurrentCdp as jest.Mock).mockReturnValue(null);
        const mockWsHandler = { getWorkspaceForChannel: jest.fn() } as any;
        const handler = createGenericActionButtonAction({ bridge: mockBridge, wsHandler: mockWsHandler });
        const deferUpdate = jest.fn().mockResolvedValue(undefined);
        const followUp = jest.fn().mockResolvedValue(undefined);
        
        await handler.execute({
            customId: 'action_btn_proceed',
            channelId: 'ch-1',
            userId: 'u-1',
            message: {} as any,
            deferUpdate,
            followUp,
        } as any, { actionName: 'Proceed' });

        expect(mockCdp.call).not.toHaveBeenCalled();
        expect(deferUpdate).toHaveBeenCalled();
        expect(followUp).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining('Not connected')
        }));
    });

    it('shows error if DOM script fails to find button', async () => {
        mockCdp.call = jest.fn().mockResolvedValue({ result: { value: { ok: false } } });
        const mockWsHandler = { getWorkspaceForChannel: jest.fn() } as any;
        const handler = createGenericActionButtonAction({ bridge: mockBridge, wsHandler: mockWsHandler });
        const deferUpdate = jest.fn().mockResolvedValue(undefined);
        const followUp = jest.fn().mockResolvedValue(undefined);
        
        await handler.execute({
            customId: 'action_btn_proceed',
            channelId: 'ch-1',
            userId: 'u-1',
            message: {} as any,
            deferUpdate,
            followUp,
        } as any, { actionName: 'Proceed' });

        expect(deferUpdate).toHaveBeenCalled();
        expect(mockCdp.call).toHaveBeenCalledWith('Runtime.evaluate', expect.objectContaining({
            expression: expect.stringContaining('Proceed')
        }));
        expect(followUp).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining('not found or obscured')
        }));
    });
});
