/**
 * Default AI Models for OpenRouter
 * These models are available for authors to use when generating content.
 *
 * Model IDs from: https://openrouter.ai/models
 */

export const defaultAiModels = [
  {
    _id: 'ai-model-deepseek-chat',
    _type: 'aiModel',
    name: 'DeepSeek Chat',
    modelId: 'deepseek/deepseek-chat',
    description: 'Fast and capable model with excellent instruction following. Great for general writing tasks.',
    isDefault: true,
  },
  {
    _id: 'ai-model-claude-3-5-sonnet',
    _type: 'aiModel',
    name: 'Claude 3.5 Sonnet',
    modelId: 'anthropic/claude-3.5-sonnet',
    description: 'Excellent writing quality with nuanced, human-like prose. Best for creative and editorial content.',
    isDefault: false,
  },
  {
    _id: 'ai-model-claude-3-opus',
    _type: 'aiModel',
    name: 'Claude 3 Opus',
    modelId: 'anthropic/claude-3-opus',
    description: 'Most capable Claude model. Premium quality for important content.',
    isDefault: false,
  },
  {
    _id: 'ai-model-gpt-4-turbo',
    _type: 'aiModel',
    name: 'GPT-4 Turbo',
    modelId: 'openai/gpt-4-turbo',
    description: 'OpenAI\'s fast GPT-4 variant. Reliable and versatile.',
    isDefault: false,
  },
  {
    _id: 'ai-model-gpt-4o',
    _type: 'aiModel',
    name: 'GPT-4o',
    modelId: 'openai/gpt-4o',
    description: 'OpenAI\'s latest multimodal model. Fast with strong reasoning.',
    isDefault: false,
  },
  {
    _id: 'ai-model-llama-3-1-70b',
    _type: 'aiModel',
    name: 'Llama 3.1 70B',
    modelId: 'meta-llama/llama-3.1-70b-instruct',
    description: 'Meta\'s open-source model. Cost-effective with good quality.',
    isDefault: false,
  },
  {
    _id: 'ai-model-gemini-pro',
    _type: 'aiModel',
    name: 'Gemini Pro 1.5',
    modelId: 'google/gemini-pro-1.5',
    description: 'Google\'s large context model. Good for detailed analysis.',
    isDefault: false,
  },
];
