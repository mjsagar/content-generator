import Groq from 'groq-sdk';
import { sanitizeHtml } from '@/lib/utils/content';
import { getTopicImage } from '@/lib/services/image';

// We wrap initialization to avoid breaking Next.js build step when GROQ_API_KEY is not set.
// It will throw when actually executed if the key is missing in production.
const getGroqClient = () => {
  return new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy-key-for-build',
  });
};

export async function generateContent(
  topic: string,
  type: 'trend' | 'niche',
  usedImages?: Set<string>
): Promise<{ title: string; content: string; slug: string }> {
  const groq = getGroqClient();
  try {
    // Resolve authentic, high-quality, guaranteed UNIQUE header image
    const headerImageUrl = await getTopicImage(topic, type, usedImages);
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
                Output the response in JSON format with exactly three fields: "title", "content" (in HTML format, ready to be displayed), and "slug" (a URL-friendly string derived from the title).
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
                Output the response in JSON format with exactly three fields: "title", "content" (in HTML format, ready to be displayed), and "slug" (a URL-friendly string derived from the title).
                CRITICAL: The HTML in "content" must be semantic and rich (<h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>). Do NOT include literal '\\n' strings or markdown code fences. Format using standard HTML tags. Include this exact header image tag right after the main title / at the top of the content: <img src="${headerImageUrl}" alt="${topic}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />. Do NOT wrap the output in html/head/body tags.`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert journalist, senior copywriter, and advanced SEO specialist writing for a UK audience. Always use British English spelling and conventions. Produce authoritative, highly professional content. Always output exactly valid JSON containing \"title\", \"content\", and \"slug\". The \"content\" field should contain well-formatted, beautiful semantic HTML designed for modern editorial styling with no literal '\\n' escape strings."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No content generated by Groq");
    }

    const parsedResult = JSON.parse(result);
    return {
      title: parsedResult.title,
      content: sanitizeHtml(parsedResult.content, parsedResult.title, type),
      slug: parsedResult.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };

  } catch (error) {
    console.error('Error generating content with Groq:', error);
    throw error;
  }
}

export async function brainstormNiches(existingTitles: string[] = []): Promise<string[]> {
  const groq = getGroqClient();

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
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0.85,
      max_tokens: 600,
      response_format: { type: "json_object" }
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) return [];

    const parsed = JSON.parse(result);
    return parsed.niches || [];
  } catch (error) {
    console.error('Error brainstorming niches:', error);
    return [];
  }
}
