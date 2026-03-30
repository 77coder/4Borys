import type { GenerationParams } from '../store';

export interface GenerateParams {
    prompt: string;
    systemPrompt?: string;
    base64Image?: string; // e.g. 'data:image/jpeg;base64,...'
    customId?: string; // For tracing in Batch workflows
    generationParams?: GenerationParams;
}

export interface GenerateResult {
    text: string;
    error?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export abstract class ModelProvider {
    protected apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    abstract readonly providerId: string;

    abstract generateLive(modelId: string, params: GenerateParams): Promise<GenerateResult>;

    async createBatchJob(_modelId: string, _requests: GenerateParams[]): Promise<string> {
        throw new Error('Batch job not supported by this provider natively yet.');
    }

    async checkBatchStatus(_batchId: string): Promise<any> {
        throw new Error('Batch check not implemented.');
    }

    async getBatchResults(_batchId: string): Promise<Record<string, GenerateResult>> {
        throw new Error('Batch results fetch not implemented.');
    }
}
