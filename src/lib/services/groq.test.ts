import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listAvailableGroqModels,
  getSelectedGroqModels,
  setSelectedGroqModels,
  getNextGroqModel,
  FALLBACK_GROQ_MODELS
} from './groq';
import { db } from '@/prisma/db';

vi.mock('@/prisma/db', () => ({
  db: {
    orm: {
      public: {
        Config: {
          where: vi.fn(),
          create: vi.fn()
        }
      }
    }
  }
}));

describe('Groq Service & Multi-LLM Rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAvailableGroqModels', () => {
    it('returns models with annotated capabilities and sorts recommended first', async () => {
      const models = await listAvailableGroqModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      // Check first model is recommended
      const first = models[0];
      expect(first.isRecommended).toBe(true);
      expect(first.isChatModel).toBe(true);
      expect(first.context_window).toBeGreaterThanOrEqual(8192);
    });
  });

  describe('getSelectedGroqModels', () => {
    it('returns parsed list from Config when available', async () => {
      const mockConfig = {
        value: JSON.stringify(['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'])
      };
      (db.orm.public.Config.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockConfig)
      });

      const selected = await getSelectedGroqModels();
      expect(selected).toEqual(['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']);
    });

    it('falls back to default model when config is missing', async () => {
      (db.orm.public.Config.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });

      const selected = await getSelectedGroqModels();
      expect(selected).toEqual([process.env.GROQ_MODEL || 'openai/gpt-oss-120b']);
    });
  });

  describe('setSelectedGroqModels', () => {
    it('throws when saving an empty array', async () => {
      await expect(setSelectedGroqModels([])).rejects.toThrow(
        'At least one model must be selected.'
      );
    });

    it('updates existing config in database', async () => {
      const updateMock = vi.fn().mockResolvedValue({});
      (db.orm.public.Config.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: '1', key: 'SELECTED_GROQ_MODELS' }),
        update: updateMock
      });

      await setSelectedGroqModels(['openai/gpt-oss-20b', 'qwen/qwen3.8-27b']);
      expect(updateMock).toHaveBeenCalledWith({
        value: JSON.stringify(['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'])
      });
    });
  });

  describe('getNextGroqModel', () => {
    it('rotates sequentially through selected models and updates rotation index', async () => {
      const models = ['model-a', 'model-b', 'model-c'];
      const updateMock = vi.fn().mockResolvedValue({});

      // Mock selected models
      (db.orm.public.Config.where as any).mockImplementation((query: any) => {
        if (query.key === 'SELECTED_GROQ_MODELS') {
          return {
            first: vi.fn().mockResolvedValue({ value: JSON.stringify(models) })
          };
        }
        if (query.key === 'GROQ_MODEL_ROTATION_INDEX') {
          return {
            first: vi.fn().mockResolvedValue({ value: '1' }),
            update: updateMock
          };
        }
        return { first: vi.fn().mockResolvedValue(null) };
      });

      const rotation = await getNextGroqModel();
      expect(rotation.model).toBe('model-b'); // index 1
      expect(rotation.index).toBe(1);
      expect(rotation.nextModel).toBe('model-c');
      expect(updateMock).toHaveBeenCalledWith({ value: '2' }); // next index 2
    });

    it('wraps around to index 0 after reaching the end of the rotation', async () => {
      const models = ['model-a', 'model-b'];
      const updateMock = vi.fn().mockResolvedValue({});

      (db.orm.public.Config.where as any).mockImplementation((query: any) => {
        if (query.key === 'SELECTED_GROQ_MODELS') {
          return {
            first: vi.fn().mockResolvedValue({ value: JSON.stringify(models) })
          };
        }
        if (query.key === 'GROQ_MODEL_ROTATION_INDEX') {
          return {
            first: vi.fn().mockResolvedValue({ value: '1' }),
            update: updateMock
          };
        }
        return { first: vi.fn().mockResolvedValue(null) };
      });

      const rotation = await getNextGroqModel();
      expect(rotation.model).toBe('model-b');
      expect(rotation.nextModel).toBe('model-a');
      expect(updateMock).toHaveBeenCalledWith({ value: '0' }); // wrapped around to 0
    });

    it('handles single selected model without advancing index', async () => {
      const models = ['single-model'];
      (db.orm.public.Config.where as any).mockImplementation((query: any) => {
        if (query.key === 'SELECTED_GROQ_MODELS') {
          return {
            first: vi.fn().mockResolvedValue({ value: JSON.stringify(models) })
          };
        }
        return { first: vi.fn().mockResolvedValue(null) };
      });

      const rotation = await getNextGroqModel();
      expect(rotation.model).toBe('single-model');
      expect(rotation.total).toBe(1);
    });
  });

  describe('generateContent & brainstormNiches resilience', () => {
    it('defensively derives slug from title when slug is undefined in LLM JSON', async () => {
      const { generateContent, getGroqClient } = await import('./groq');
      const client = getGroqClient();

      vi.spyOn(client.chat.completions, 'create').mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'High Tech Wind Farms in Scotland',
                content: '<p>Scottish wind generation leads the UK.</p>',
                category: 'Tech & Innovation'
                // slug intentionally omitted
              })
            }
          }
        ]
      } as any);

      const result = await generateContent('Scottish wind farms', 'trend', undefined, 'openai/gpt-oss-120b');
      expect(result.title).toBe('High Tech Wind Farms in Scotland');
      expect(result.slug).toBe('high-tech-wind-farms-in-scotland');
      expect(result.category).toBe('Tech & Innovation');
    });

    it('handles LLM output wrapped in nested container and uppercase keys', async () => {
      const { generateContent, getGroqClient } = await import('./groq');
      const client = getGroqClient();

      vi.spyOn(client.chat.completions, 'create').mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                article: {
                  Title: 'Ancient Woodlands of Yorkshire',
                  Content: '<p>Yorkshire ancient forests.</p>',
                  Slug: 'ancient-yorkshire-woods'
                }
              })
            }
          }
        ]
      } as any);

      const result = await generateContent('Yorkshire woodlands', 'niche', undefined, 'openai/gpt-oss-120b');
      expect(result.title).toBe('Ancient Woodlands of Yorkshire');
      expect(result.slug).toBe('ancient-yorkshire-woods');
    });

    it('handles brainstormNiches returning array directly', async () => {
      const { brainstormNiches, getGroqClient } = await import('./groq');
      const client = getGroqClient();

      vi.spyOn(client.chat.completions, 'create').mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(['Topic 1', 'Topic 2', 'Topic 3'])
            }
          }
        ]
      } as any);

      const niches = await brainstormNiches([]);
      expect(niches).toEqual(['Topic 1', 'Topic 2', 'Topic 3']);
    });
  });
});
