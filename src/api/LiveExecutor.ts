import { useAppStore, type ExperimentItem } from '../store';
import { getProviderInstance } from './ProviderFactory';

class AsyncQueue {
    private concurrency: number;
    private running: number = 0;
    private queue: (() => Promise<void>)[] = [];

    constructor(concurrency: number) {
        this.concurrency = concurrency;
    }

    setConcurrency(limit: number) {
        this.concurrency = limit;
        this.processQueue();
    }

    enqueue(task: () => Promise<void>) {
        this.queue.push(task);
        this.processQueue();
    }

    private async processQueue() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.running++;
        const task = this.queue.shift();
        if (task) {
            try {
                await task();
            } catch (err) {
                console.error('Task failed:', err);
            } finally {
                this.running--;
                this.processQueue();
            }
        }
    }
}

// Global executor instance
export const liveQueue = new AsyncQueue(2);

export const startLiveExecution = () => {
    const store = useAppStore.getState();
    const items = store.experimentItems;
    const models = store.models;
    const globalPrompt = store.globalPrompt;

    // Update concurrency if it changed
    liveQueue.setConcurrency(store.concurrencyLimit);

    items.forEach((item: ExperimentItem) => {
        models.forEach(model => {
            // Check if already success or loading
            const currentResult = item.results[model.id];
            if (currentResult?.status === 'success' || currentResult?.status === 'loading') {
                return;
            }

            // Mark as queued/loading
            useAppStore.getState().updateExperimentItemResult(item.id, model.id, { status: 'loading' });

            // Enqueue the actual API call
            liveQueue.enqueue(async () => {
                const provider = getProviderInstance(model.provider);
                if (!provider) {
                    useAppStore.getState().updateExperimentItemResult(item.id, model.id, {
                        status: 'error',
                        error: `Provider ${model.provider} nie jest zaimplementowany lub brak klucza API.`
                    });
                    return;
                }

                const promptToUse = item.individualPrompt || globalPrompt;
                // Grab the currently selected params
                const currentGenerationParams = store.generationParams;

                const result = await provider.generateLive(model.id, {
                    prompt: promptToUse,
                    base64Image: item.imageBase64,
                    generationParams: currentGenerationParams
                });

                if (result.error) {
                    useAppStore.getState().updateExperimentItemResult(item.id, model.id, {
                        status: 'error',
                        error: result.error
                    });
                } else {
                    useAppStore.getState().updateExperimentItemResult(item.id, model.id, {
                        status: 'success',
                        text: result.text,
                        usage: result.usage,
                    });
                }
            });
        });
    });
};
