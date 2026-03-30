import { useAppStore } from '../store';
import { getProviderInstance } from './ProviderFactory';

export const startBatchExecution = async () => {
    const store = useAppStore.getState();
    const items = store.experimentItems;
    const globalPrompt = store.globalPrompt;
    const models = store.models;

    // Filter models that support batching
    const batchModels = models.filter(m => m.supportsBatch);

    for (const model of batchModels) {
        const provider = getProviderInstance(model.provider);
        if (!provider) continue;

        // Find items that don't have success or loading status for this model
        const itemsToProcess = items.filter(item => {
            const currentResult = item.results[model.id];
            return currentResult?.status !== 'success' && currentResult?.status !== 'loading';
        });

        if (itemsToProcess.length === 0) continue;

        // Mark them as loading immediately so UI updates
        itemsToProcess.forEach(item => {
            useAppStore.getState().updateExperimentItemResult(item.id, model.id, { status: 'loading' });
        });

        const requests = itemsToProcess.map(item => ({
            customId: item.id, // we might need to thread customId through GenerateParams if supported. Let's create an extended interface locally if needed.
            prompt: item.individualPrompt || globalPrompt,
            base64Image: item.imageBase64,
        }));

        try {
            // We need to pass customId to createBatchJob. Let's adjust GenerateParams in ModelProvider if we need to.
            // For now let's pass an array of { id, params }
            const mappedRequests = requests.map(req => ({
                customId: req.customId,
                params: {
                    prompt: req.prompt,
                    base64Image: req.base64Image,
                    generationParams: store.generationParams
                }
            }));

            // Let's assume createBatchJob takes (modelId, mappedRequests) and returns batchId string.
            // We need to update ModelProvider.ts interface first. Let's do that right after.
            const generateParamsWithIds = mappedRequests.map(r => ({ ...r.params, customId: r.customId }));

            const batchId = await provider.createBatchJob(model.id, generateParamsWithIds);

            useAppStore.getState().addActiveBatch({
                batchId,
                providerId: model.provider,
                modelId: model.id,
                status: 'in_progress',
                createdAt: Date.now(),
                itemIds: itemsToProcess.map(i => i.id)
            });

        } catch (error: any) {
            console.error(`Failed to create batch for ${model.id}:`, error);
            // Revert status to error
            itemsToProcess.forEach(item => {
                useAppStore.getState().updateExperimentItemResult(item.id, model.id, {
                    status: 'error',
                    error: error.message || 'Nie udało się utworzyć zadania Batch.'
                });
            });
        }
    }
};

export const checkActiveBatches = async () => {
    const store = useAppStore.getState();
    const activeBatches = store.activeBatches.filter(b => b.status === 'in_progress');

    for (const batch of activeBatches) {
        const provider = getProviderInstance(batch.providerId);
        if (!provider) continue;

        try {
            // Check status first
            await provider.checkBatchStatus(batch.batchId);

            // For now, let's just attempt to getBatchResults. It will throw if not completed.
            try {
                const results = await provider.getBatchResults(batch.batchId);

                // If we get here, it means it completed and we got the results map
                for (const [customId, result] of Object.entries(results)) {
                    store.updateExperimentItemResult(customId, batch.modelId, {
                        status: result.error ? 'error' : 'success',
                        text: result.text,
                        error: result.error,
                        usage: result.usage
                    });
                }

                // Mark batch as completed
                store.updateActiveBatchStatus(batch.batchId, 'completed');

            } catch (err: any) {
                // If it throws "not yet completed", we just skip.
                if (err.message.includes('not yet completed') || err.message.includes('output file not ready') || err.message.includes('not ended')) {
                    continue;
                }

                // If it's a real failure: // Add expired check based on provider 
                if (err.message.includes('failed') || err.message.includes('expired') || err.message.includes('cancelled')) {
                    store.updateActiveBatchStatus(batch.batchId, 'failed');
                    // Mark items as error
                    batch.itemIds.forEach(itemId => {
                        store.updateExperimentItemResult(itemId, batch.modelId, {
                            status: 'error',
                            error: 'Batch failed or expired'
                        });
                    });
                }
            }

        } catch (error) {
            console.error(`Error checking batch ${batch.batchId}:`, error);
        }
    }
};
