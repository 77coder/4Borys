import type { GenerateParams, GenerateResult } from '../ModelProvider';
import { ModelProvider } from '../ModelProvider';

export class GoogleProvider extends ModelProvider {
    readonly providerId = 'google';

    async generateLive(modelId: string, params: GenerateParams): Promise<GenerateResult> {
        if (!this.apiKey) {
            return { text: '', error: 'Brak klucza API dla Google (Gemini)' };
        }

        try {
            const contents = [];
            const parts: any[] = [];

            if (params.prompt) {
                parts.push({ text: params.prompt });
            }

            if (params.base64Image) {
                const match = params.base64Image.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
                if (match) {
                    const mimeType = match[1];
                    const base64Data = match[2];
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });
                }
            }

            contents.push({ parts });

            const requestBody: any = {
                contents,
            };

            if (params.systemPrompt) {
                requestBody.systemInstruction = {
                    parts: [{ text: params.systemPrompt }]
                };
            }

            if (params.generationParams) {
                requestBody.generationConfig = {
                    temperature: params.generationParams.temperature,
                    topP: params.generationParams.top_p,
                    topK: params.generationParams.top_k,
                    maxOutputTokens: params.generationParams.max_tokens,
                    presencePenalty: params.generationParams.presence_penalty,
                    frequencyPenalty: params.generationParams.frequency_penalty
                };
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Google API Error: ${response.status} ${errBody}`);
            }

            const data = await response.json();

            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text || '';

            return {
                text,
                usage: {
                    promptTokens: data.usageMetadata?.promptTokenCount || 0,
                    completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: data.usageMetadata?.totalTokenCount || 0,
                }
            };
        } catch (error: any) {
            return { text: '', error: error.message || 'Nieznany błąd podczas łączenia z API Google' };
        }
    }
}
