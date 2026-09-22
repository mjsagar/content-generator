import Groq from 'groq-sdk';
import { db } from '@/prisma/db';
import { sanitizeHtml } from '@/lib/utils/content';
import { getTopicImage } from '@/lib/services/image';
import { inferArticleCategory, CATEGORY_NAMES } from '@/lib/services/category';

export interface GroqModelInfo {
  id: string;
  name: string;
  owned_by: string;
  context_window: number;
  max_completion_tokens?: number;
  isChatModel: boolean;
  isRecommended: boolean;
  active: boolean;
  supported_features?: string[];
}

export const FALLBACK_GROQ_MODELS: GroqModelInfo[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    owned_by: 'OpenAI',
    context_window: 131072,
    max_completion_tokens: 65536,
    isChatModel: true,
    isRecommended: true,
    active: true,
    supported_features: ['tools', 'json_mode', 'structured_outputs', 'reasoning']
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    owned_by: 'OpenAI',
    context_window: 131072,
    max_completion_tokens: 65536,
    isChatModel: true,
    isRecommended: true,
    active: true,
    supported_features: ['tools', 'json_mode', 'structured_outputs', 'reasoning']
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    owned_by: 'Alibaba Cloud',
    context_window: 131042,
    max_completion_tokens: 16384,
    isChatModel: true,
    isRecommended: true,
    active: true,
    supported_features: ['tools', 'json_mode', 'reasoning']
  },
  {
    id: 'allam-2-7b',
    name: 'ALLaM 2 7B',
    owned_by: 'SDAIA',
    context_window: 4096,
    max_completion_tokens: 4096,
    isChatModel: true,
    isRecommended: false,
    active: true,
    supported_features: ['json_mode']
  }
];

let groqClientInstance: Groq | null = null;
export const getGroqClient = () => {
  if (!groqClientInstance) {
    groqClientInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build',
      dangerouslyAllowBrowser: true,
    });
  }
  return groqClientInstance;
};

/**
 * Fetches all available models directly from the Groq API and annotates capabilities.
 */
export async function listAvailableGroqModels(): Promise<GroqModelInfo[]> {
  try {
    const groq = getGroqClient();
    const response = await groq.models.list();
    if (!response?.data || !Array.isArray(response.data)) {
      return FALLBACK_GROQ_MODELS;
    }

    const models: GroqModelInfo[] = response.data.map((m: any) => {
      const outputModalities: string[] = m.output_modalities || [];
      const hasSpeechOrTranscription = outputModalities.includes('speech') || outputModalities.includes('transcription');
      const lowerId = (m.id || '').toLowerCase();
      const isGuardOrWhisper =
        lowerId.includes('prompt-guard') ||
        lowerId.includes('safeguard') ||
        lowerId.includes('whisper');

      const isChatModel =
        m.active !== false &&
        !hasSpeechOrTranscription &&
        !isGuardOrWhisper &&
        (outputModalities.length === 0 || outputModalities.includes('text')) &&
        (m.context_window || 0) >= 2048;

      const isRecommended =
        isChatModel &&
        (m.context_window || 0) >= 8192 &&
        (lowerId.includes('gpt-oss') || lowerId.includes('qwen'));

      return {
        id: m.id,
        name: m.name || m.id,
        owned_by: m.owned_by || 'Groq',
        context_window: m.context_window || 4096,
        max_completion_tokens: m.max_completion_tokens || 4096,
        isChatModel,
        isRecommended,
        active: m.active !== false,
        supported_features: m.supported_features || []
      };
    });

    // Sort: Recommended first, then chat models, then others
    models.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      if (a.isChatModel && !b.isChatModel) return -1;
      if (!a.isChatModel && b.isChatModel) return 1;
      return a.name.localeCompare(b.name);
    });

    return models;
  } catch (error) {
    console.error('Error fetching Groq models from API, using fallback:', error);
    return FALLBACK_GROQ_MODELS;
  }
}

/**
 * Retrieves the currently active selected Groq models list from the Config table.
 */
export async function getSelectedGroqModels(): Promise<string[]> {
  try {
    const config = await db.orm.public.Config.where({ key: 'SELECTED_GROQ_MODELS' }).first();
    if (config?.value) {
      const parsed = JSON.parse(config.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      }
    }
  } catch (error) {
    console.error('Error reading SELECTED_GROQ_MODELS from db:', error);
  }
  return [process.env.GROQ_MODEL || 'openai/gpt-oss-120b'];
}

/**
 * Saves the selected Groq models list to the database Config table.
 */
export async function setSelectedGroqModels(models: string[]): Promise<void> {
  const cleanModels = models.filter(m => typeof m === 'string' && m.trim().length > 0);
  if (cleanModels.length === 0) {
    throw new Error('At least one model must be selected.');
  }

  const serialized = JSON.stringify(cleanModels);
  const existing = await db.orm.public.Config.where({ key: 'SELECTED_GROQ_MODELS' }).first();
  if (existing) {
    await db.orm.public.Config.where({ key: 'SELECTED_GROQ_MODELS' }).update({ value: serialized });
  } else {
    await db.orm.public.Config.create({ key: 'SELECTED_GROQ_MODELS', value: serialized });
  }

  // Ensure current rotation index is within bounds
  const rotationIndexConfig = await db.orm.public.Config.where({ key: 'GROQ_MODEL_ROTATION_INDEX' }).first();
  if (rotationIndexConfig) {
    const idx = parseInt(rotationIndexConfig.value, 10);
    if (isNaN(idx) || idx >= cleanModels.length) {
      await db.orm.public.Config.where({ key: 'GROQ_MODEL_ROTATION_INDEX' }).update({ value: '0' });
    }
  }
}

/**
 * Atomically advances the rotation index and returns the next model to use.
 */
export async function getNextGroqModel(): Promise<{
  model: string;
  index: number;
  total: number;
  nextModel: string;
}> {
  const selectedModels = await getSelectedGroqModels();
  if (selectedModels.length === 0) {
    const fallback = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    return { model: fallback, index: 0, total: 1, nextModel: fallback };
  }

  if (selectedModels.length === 1) {
    return {
      model: selectedModels[0],
      index: 0,
      total: 1,
      nextModel: selectedModels[0]
    };
  }

  try {
    const rotationConfig = await db.orm.public.Config.where({ key: 'GROQ_MODEL_ROTATION_INDEX' }).first();
    const rawIndex = parseInt(rotationConfig?.value || '0', 10);
    const currentIndex = (isNaN(rawIndex) || rawIndex < 0 ? 0 : rawIndex) % selectedModels.length;

    const chosenModel = selectedModels[currentIndex];
    const nextIndex = (currentIndex + 1) % selectedModels.length;
    const nextModel = selectedModels[nextIndex];

    if (rotationConfig) {
      await db.orm.public.Config.where({ key: 'GROQ_MODEL_ROTATION_INDEX' }).update({ value: nextIndex.toString() });
    } else {
      await db.orm.public.Config.create({ key: 'GROQ_MODEL_ROTATION_INDEX', value: nextIndex.toString() });
    }

    return {
      model: chosenModel,
      index: currentIndex,
      total: selectedModels.length,
      nextModel
    };
  } catch (error) {
    console.error('Error resolving next Groq model in rotation:', error);
    return {
      model: selectedModels[0],
      index: 0,
      total: selectedModels.length,
      nextModel: selectedModels[1] || selectedModels[0]
    };
  }
}

export async function generateContent(
  topic: string,
  type: 'trend' | 'niche',
  usedImages?: Set<string>,
  modelOverride?: string
): Promise<{ title: string; content: string; slug: string; category: string; modelUsed: string }> {
  const groq = getGroqClient();

  // Resolve model to use from rotation or override
  let model = modelOverride;
  let rotationInfo: { index: number; total: number } | null = null;
  if (!model) {
    const rotation = await getNextGroqModel();
    model = rotation.model;
    rotationInfo = { index: rotation.index, total: rotation.total };
  }

  console.log(`[Groq] Generating ${type} article "${topic}" using model: ${model}${rotationInfo ? ` (Rotation ${rotationInfo.index + 1}/${rotationInfo.total})` : ''}`);

  try {
    // Pre-infer tentative category from topic to assist with domain-accurate image fallback
    const tentativeCategory = inferArticleCategory(topic);

    // Resolve authentic, high-quality, guaranteed UNIQUE header image
    const headerImageUrl = await getTopicImage(topic, type, usedImages, tentativeCategory);
    if (usedImages) {
      usedImages.add(headerImageUrl);
    }

    let prompt = '';

    if (type === 'trend') {
      prompt = `Write a highly professional, authoritative, and SEO-optimised editorial analysis about the current trending topic: "${topic}".
                This article is for a sophisticated UK audience on a professional UK-based publication (theinformationhub.uk).
                Maintain a journalistic, expert tone throughout. Use British English spelling (e.g., colour, favourite, organise, centre).
                Reference UK-specific context, laws, regulations, economic impacts in GBP (£), and cultural nuances where relevant.
                Structure the article with:
                - A compelling, professional headline.
                - An executive summary or 'Key Takeaways' section at the beginning.
                - An in-depth introduction.
                - Detailed, well-structured body sections with clear subheadings, using blockquotes for emphasis where appropriate.
                - A concluding 'Final Thoughts' or 'Future Outlook' section.
                Output the response in JSON format with exactly four fields: "title", "content" (in HTML format, ready to be displayed), "slug" (a URL-friendly string derived from the title), and "category" (choose one of: "Wildlife & Nature", "Personal Finance", "Heritage & Travel", "Home & Garden", "Tech & Innovation", "Sports & Culture", "News & Society", "General").
                CRITICAL: The HTML in "content" must be semantic and rich (<h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>). Do NOT include literal '\\n' strings or markdown code fences. Format using standard HTML tags. Include this exact header image tag right after the main headline / at the top of the content: <img src="${headerImageUrl}" alt="${topic}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />. Do NOT wrap the output in html/head/body tags.`;
    } else {
      prompt = `Write an authoritative, comprehensive, and bespoke expert guide for the specific niche: "${topic}".
                This article is for a sophisticated UK audience on a professional UK-based publication (theinformationhub.uk).
                Maintain a highly knowledgeable and professional tone. Use British English spelling (e.g., colour, favourite, organise, centre).
                Reference UK-specific context where relevant (e.g., UK climate, professional standards, UK availability, prices in GBP).
                Structure the guide with:
                - A professional, definitive title.
                - An executive summary or 'Key Takeaways' list.
                - A thorough introduction establishing authority.
                - Detailed body sections broken down logically with subheadings, providing advanced insights rather than basic tips.
                - A concluding summary.
                Output the response in JSON format with exactly four fields: "title", "content" (in HTML format, ready to be displayed), "slug" (a URL-friendly string derived from the title), and "category" (choose one of: "Wildlife & Nature", "Personal Finance", "Heritage & Travel", "Home & Garden", "Tech & Innovation", "Sports & Culture", "News & Society", "General").
                CRITICAL: The HTML in "content" must be semantic and rich (<h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>). Do NOT include literal '\\n' strings or markdown code fences. Format using standard HTML tags. Include this exact header image tag right after the main title / at the top of the content: <img src="${headerImageUrl}" alt="${topic}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />. Do NOT wrap the output in html/head/body tags.`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert journalist, senior copywriter, and advanced SEO specialist writing for a UK audience. Always use British English spelling and conventions. Produce authoritative, highly professional content. Always output exactly valid JSON containing \"title\", \"content\", \"slug\", and \"category\". The \"content\" field should contain well-formatted, beautiful semantic HTML designed for modern editorial styling with no literal '\\n' escape strings."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model,
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) {
      throw new Error(`No content generated by Groq model "${model}"`);
    }

    const parsedResult = JSON.parse(result);
    // Unwrap if nested in data, article, content_object, etc.
    const data = parsedResult.article || parsedResult.data || parsedResult.content_object || parsedResult;

    const rawTitle = data.title || data.Title || data.headline || data.Headline || topic || 'Untitled Article';
    const title = String(rawTitle).trim();
    const rawContent = data.content || data.Content || data.body || data.Body || data.article || data.html || '';
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    const rawSlug = data.slug || data.Slug || title;
    const slug = String(rawSlug || title || topic)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `article-${Date.now()}`;

    const rawCategory = data.category || data.Category;
    const assignedCategory = (rawCategory && CATEGORY_NAMES.includes(rawCategory))
      ? rawCategory
      : inferArticleCategory(title, content);

    return {
      title,
      content: sanitizeHtml(content, title, type),
      slug,
      category: assignedCategory,
      modelUsed: model
    };

  } catch (error) {
    console.error(`Error generating content with Groq model "${model}":`, error);
    throw error;
  }
}

export async function brainstormNiches(existingTitles: string[] = [], modelOverride?: string): Promise<string[]> {
  const groq = getGroqClient();
  const model = modelOverride || (await getSelectedGroqModels())[0] || process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  // Diverse UK categories to cycle through and explore
  const UK_CATEGORIES = [
    "British Wildlife & Countryside Conservation (e.g. hedgehog rescue, barn owls, red squirrels)",
    "UK Personal Finance & Planning (e.g. Cash ISA vs Stocks & Shares ISA, Premium Bonds odds, pension tax relief)",
    "British Heritage & Scenic Travel (e.g. Northumberland coastal walks, Snowdonia peaks, Jurassic Coast fossils)",
    "UK Home Improvement, Allotments & Gardening (e.g. growing heritage tomatoes in UK soil, heat pump grants, Victorian house damp proofing)",
    "British Transport & Automotive (e.g. UK electric vehicle charging networks, classic British motorcycle restoration, high-speed rail history)",
    "Regional British Food, Cheese & Brewing (e.g. artisan stilton production, traditional sourdough bakeries in Britain, Cornish cider)",
    "British Tech Innovations & Green Energy (e.g. North Sea offshore wind power, UK quantum computing startups, domestic solar batteries)",
    "UK Sports, Hobbies & Outdoor Life (e.g. fell running in the Lake District, Thames rowing clubs, crown green bowls history)"
  ];

  // Pick 3 random distinct categories each time for rich variety
  const shuffled = [...UK_CATEGORIES].sort(() => 0.5 - Math.random());
  const selectedCategories = shuffled.slice(0, 3).join("; ");

  const avoidList = existingTitles.length > 0
    ? `\nCRITICAL: DO NOT repeat or suggest anything similar to these already covered topics:\n${existingTitles.slice(0, 30).map(t => `- ${t}`).join('\n')}`
    : '';

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert editorial strategist and creative brainstorming assistant for a UK publication (theinformationhub.uk). Your goal is to find distinctive, fresh, high-interest topics tailored for a sophisticated UK audience. Output only a valid JSON object containing a \"niches\" array of strings."
        },
        {
          role: "user",
          content: `Generate a list of 10 specific, unique, and deeply engaging article ideas tailored for a UK audience.
Focus especially on these diverse areas: ${selectedCategories}.
Make each topic distinctive, informative, and engaging for British readers.${avoidList}
Every item MUST be a completely distinct subject. Avoid overly basic topics. Output as a JSON object with a "niches" array of 10 strings.`
        }
      ],
      model,
      temperature: 0.85,
      max_tokens: 600,
      response_format: { type: "json_object" }
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch {
      return [];
    }

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    const niches = parsed.niches || parsed.Niches || parsed.ideas || parsed.topics || parsed.data || [];
    if (Array.isArray(niches)) {
      return niches.filter((item: any): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
  } catch (error) {
    console.error('Error brainstorming niches:', error);
    return [];
  }
}

