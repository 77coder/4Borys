import { ModelProvider } from './ModelProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GoogleProvider } from './providers/GoogleProvider';
import { MistralProvider } from './providers/MistralProvider';
import { useAppStore } from '../store';

export function getProviderInstance(providerName: string): ModelProvider | null {
    const store = useAppStore.getState();

    switch (providerName) {
        case 'openai':
            return new OpenAIProvider(store.openAIKey);
        case 'anthropic':
            return new AnthropicProvider(store.anthropicKey);
        case 'google':
            return new GoogleProvider(store.googleKey);
        case 'mistral':
            return new MistralProvider(store.mistralKey);
        case 'grok':
            return new OpenAIProvider(store.grokKey, 'https://api.x.ai/v1');
        case 'kimi':
            return new OpenAIProvider(store.kimiKey, 'https://api.moonshot.cn/v1');
        case 'qwen':
            // DashScope uses openai compatible interface on slightly different url
            return new OpenAIProvider(store.qwenKey, 'https://dashscope.aliyuncs.com/compatible-mode/v1');
        case 'llama':
            // Using Together AI as the generic provider for Llama
            return new OpenAIProvider(store.llamaKey, 'https://api.together.xyz/v1');
        case 'openrouter':
            // Using OpenRouter generic proxy wrapper
            return new OpenAIProvider(store.openRouterKey, 'https://openrouter.ai/api/v1');
        default:
            return null;
    }
}
