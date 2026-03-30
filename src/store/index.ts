import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export interface ExperimentItem {
    id: string;
    imageFile?: File; // Keep reference to file if needed locally
    imageBase64?: string;
    individualPrompt?: string;
    results: Record<string, {
        status: 'idle' | 'loading' | 'success' | 'error';
        text?: string;
        error?: string;
        usage?: { promptTokens: number; completionTokens: number; totalTokens: number; }
    }>;
}

export interface ActiveBatch {
    batchId: string;
    providerId: string;
    modelId: string;
    status: 'in_progress' | 'completed' | 'failed';
    createdAt: number;
    itemIds: string[];
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    worksWithImages: boolean;
    supportsBatch: boolean;
}

export interface GenerationParams {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    seed?: number | null;
}

export interface AppSettings {
    theme: Theme;
    openAIKey: string;
    anthropicKey: string;
    googleKey: string;
    mistralKey: string;
    grokKey: string;
    kimiKey: string;
    qwenKey: string;
    llamaKey: string;
    openRouterKey: string;
    concurrencyLimit: number;
    globalPrompt: string;
    generationParams: GenerationParams;
}

interface AppState extends AppSettings {
    experimentItems: ExperimentItem[];
    activeBatches: ActiveBatch[];
    setTheme: (theme: Theme) => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    updateGenerationParams: (params: Partial<GenerationParams>) => void;
    setExperimentItems: (items: ExperimentItem[] | ((prev: ExperimentItem[]) => ExperimentItem[])) => void;
    updateExperimentItemResult: (itemId: string, modelId: string, resultData: Partial<ExperimentItem['results'][string]>) => void;
    clearExperiment: () => void;
    addActiveBatch: (batch: ActiveBatch) => void;
    updateActiveBatchStatus: (batchId: string, status: ActiveBatch['status']) => void;
    models: ModelConfig[];
    addModel: (model: ModelConfig) => void;
    removeModel: (modelId: string) => void;
}

const defaultModels: ModelConfig[] = [
    // OpenAI Models
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', worksWithImages: true, supportsBatch: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', worksWithImages: true, supportsBatch: true },
    { id: 'gpt-4.5', name: 'GPT-4.5', provider: 'openai', worksWithImages: true, supportsBatch: true },
    { id: 'o1', name: 'o1', provider: 'openai', worksWithImages: true, supportsBatch: false },
    { id: 'o1-pro', name: 'o1 Pro', provider: 'openai', worksWithImages: true, supportsBatch: false },
    { id: 'o3', name: 'o3', provider: 'openai', worksWithImages: true, supportsBatch: false },

    // Anthropic Models
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic', worksWithImages: true, supportsBatch: true },
    { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 Thinking', provider: 'anthropic', worksWithImages: true, supportsBatch: false },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', worksWithImages: true, supportsBatch: true },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic', worksWithImages: true, supportsBatch: true },

    // Google Models
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', provider: 'google', worksWithImages: true, supportsBatch: false },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'google', worksWithImages: true, supportsBatch: false },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', worksWithImages: true, supportsBatch: false },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'google', worksWithImages: true, supportsBatch: false },

    // xAI (Grok) Models
    { id: 'grok-4', name: 'Grok-4', provider: 'grok', worksWithImages: true, supportsBatch: false },
    { id: 'grok-4-1-fast-reasoning', name: 'Grok-4.1 Fast Reasoning', provider: 'grok', worksWithImages: true, supportsBatch: false },
    { id: 'grok-4-1-fast-non-reasoning', name: 'Grok-4.1 Fast Non-Reasoning', provider: 'grok', worksWithImages: true, supportsBatch: false },
    { id: 'grok-3-mini', name: 'Grok-3 Mini', provider: 'grok', worksWithImages: true, supportsBatch: false },

    // Mistral Models
    { id: 'pixtral-large-latest', name: 'Pixtral Large', provider: 'mistral', worksWithImages: true, supportsBatch: false },
    { id: 'ministral-14b-2512', name: 'Ministral 14B', provider: 'mistral', worksWithImages: true, supportsBatch: false },
    { id: 'ministral-3b-2512', name: 'Ministral 3B', provider: 'mistral', worksWithImages: true, supportsBatch: false },

    // Alibaba (Qwen) Models
    { id: 'qwen-vl-max', name: 'Qwen VL Max', provider: 'qwen', worksWithImages: true, supportsBatch: false },
    { id: 'qwen/qwen3-vl-30b-a3b-thinking', name: 'Qwen3 VL 30B Thinking (OpenRouter)', provider: 'qwen', worksWithImages: true, supportsBatch: false },

    // Moonshot AI (Kimi) Models
    { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'kimi', worksWithImages: true, supportsBatch: false },
    { id: 'kimi-k2.5-thinking', name: 'Kimi K2.5 Thinking', provider: 'kimi', worksWithImages: true, supportsBatch: false },

    // Meta Llama Models
    { id: 'meta-llama-3-2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', provider: 'llama', worksWithImages: true, supportsBatch: false }
];

const defaultSettings: AppSettings = {
    theme: 'dark',
    openAIKey: '',
    anthropicKey: '',
    googleKey: '',
    mistralKey: '',
    grokKey: '',
    kimiKey: '',
    qwenKey: '',
    llamaKey: '',
    openRouterKey: '',
    concurrencyLimit: 2,
    globalPrompt: 'Jesteś ekspertem dermatologiem. Obejrzyj zdjęcie i oceń ryzyko złośliwości znamienia w skali 1-10. Uzasadnij odpowiedź krótko.',
    generationParams: {
        temperature: 0.7,
        top_p: 1.0,
        top_k: 40,
        max_tokens: 4096,
        presence_penalty: 0,
        frequency_penalty: 0,
        seed: null,
    }
};

export const useAppStore = create<AppState>()(
    persist(
        (set: any) => ({
            ...defaultSettings,
            experimentItems: [] as ExperimentItem[],
            setTheme: (theme: Theme) => set({ theme }),
            updateSettings: (newSettings: Partial<AppSettings>) => set((state: AppState) => ({ ...state, ...newSettings })),
            updateGenerationParams: (params: Partial<GenerationParams>) => set((state: AppState) => ({
                generationParams: { ...state.generationParams, ...params }
            })),
            setExperimentItems: (items: any) => set((state: AppState) => ({
                experimentItems: typeof items === 'function' ? items(state.experimentItems) : items
            })),
            updateExperimentItemResult: (itemId: string, modelId: string, resultData: any) => set((state: AppState) => {
                const newItems = state.experimentItems.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                        ...item,
                        results: {
                            ...item.results,
                            [modelId]: {
                                ...(item.results[modelId] || { status: 'idle' }),
                                ...resultData
                            }
                        }
                    };
                });
                return { experimentItems: newItems };
            }),
            clearExperiment: () => set({ experimentItems: [] }),
            activeBatches: [] as ActiveBatch[],
            addActiveBatch: (batch: ActiveBatch) => set((state: AppState) => ({ activeBatches: [...state.activeBatches, batch] })),
            updateActiveBatchStatus: (batchId: string, status: ActiveBatch['status']) => set((state: AppState) => ({
                activeBatches: state.activeBatches.map(b => b.batchId === batchId ? { ...b, status } : b)
            })),
            models: defaultModels,
            addModel: (model: ModelConfig) => set((state: AppState) => {
                // Ignore if ID already exists
                if (state.models.find(m => m.id === model.id)) return state;
                return { models: [...state.models, model] };
            }),
            removeModel: (modelId: string) => set((state: AppState) => ({
                models: state.models.filter(m => m.id !== modelId)
            }))
        }),
        {
            name: 'llm-tester-storage',
            partialize: (state: AppState) => ({ ...state, experimentItems: state.experimentItems.map(item => ({ ...item, imageFile: undefined })) })
        }
    )
);
