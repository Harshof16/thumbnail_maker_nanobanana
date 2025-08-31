/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import OpenAI from 'openai';
import 'dotenv/config';

export type Responses = {
  videoType?: string;
  style?: string;
  mood?: string;
  audience?: string;
  context?: string;
  placement?: string;
  [key: string]: string | undefined;
};

// Helper: try to pull a base64 payload out of a string that may contain reasoning text.
function extractBase64FromString(s: string): string | null {
  // Look for data URLs first
  const dataUrlMatch = s.match(/data:image\/(?:png|jpeg|jpg);base64,([A-Za-z0-9+/=\n\r]+)/i);
  if (dataUrlMatch && dataUrlMatch[1]) return dataUrlMatch[1].replace(/\s+/g, '');

  // Otherwise try to find a long base64 blob in the string
  const blobMatch = s.match(/([A-Za-z0-9+/=]{200,})/);
  if (blobMatch && blobMatch[1]) return blobMatch[1].replace(/\s+/g, '');

  return null;
}

/**
 * Build a single system prompt that merges all questionnaire fields.
 */
export function buildSystemPrompt(responses: Responses, placement = 'center') {
  const parts: string[] = [];
  parts.push(`Create a YouTube thumbnail for a ${responses.videoType || 'video'}.`);
  if (responses.style) parts.push(`Style: ${responses.style}.`);
  if (responses.mood) parts.push(`Mood/tones: ${responses.mood}.`);
  if (responses.audience) parts.push(`Target audience: ${responses.audience}.`);
  if (responses.context) parts.push(`Context / notes: ${responses.context}.`);
  parts.push(`Place the subject ${placement}. Use strong contrast, bold typography and a clear focal point for thumbnails. Provide compositions suitable for horizontal (16:9), vertical (9:16) and square (1:1) variants.`);
  // Add instructions for color palette and composition hints
  parts.push('Prefer high contrast colors, large readable text, and an expressive subject facial expression when applicable. Avoid busy backgrounds and ensure text area has safe margin.');
  // Modern design guidance: encourage contemporary, high-quality thumbnails
  parts.push(
    'Design guidance: follow modern YouTube thumbnail trends — use vibrant but controlled color palettes (bold gradients, neon accents), cinematic or studio-style lighting, subtle 3D depth and soft drop-shadows to separate subject and background. Favor large, highly legible sans-serif typography, strong subject isolation, and generous negative space. Avoid dated collage or clip-art looks, heavy film grain, or low-resolution textures. Prefer polished, high-resolution imagery or tasteful stylized illustrations. Provide at least 2 contrasting color palette options and a clear focal area that reads even at small sizes.'
  );

  return parts.join(' ');
}

/**
 * Rewrites or expands the prompt using an LLM if credentials are provided.
 * Currently will try OpenAI if OPENAI_API_KEY is present; otherwise returns the input prompt unchanged.
 * You can extend this to call Google Vertex Text models if desired.
 */
export async function rewritePrompt(prompt: string) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an assistant that rewrites short creative prompts for image generation.' },
            { role: 'user', content: `Rewrite and expand this prompt to be concise and detailed for image generation: ${prompt}` }
          ],
          max_tokens: 300,
        },
        { headers: { Authorization: `Bearer ${openaiKey}` } }
      );

      const text = res.data?.choices?.[0]?.message?.content;
      if (text) return text.trim();
    } catch (err) {
      console.warn('OpenAI rewrite failed, falling back to original prompt', err);
    }
  }

  // Fallback: return the original prompt
  return prompt;
}

export async function generateImageWithVertex(prompt: string, baseImageB64?: string, size = '1280x720') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelForOpenAI = process.env.OPENAI_IMAGE_MODEL || process.env.GOOGLE_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview';

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY or OPENROUTER_API_KEY for image generation');
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
  console.log('prompt', prompt)

  const contentBlocks: any[] = [{ type: 'text', text: prompt }];
console.log('contentBlocks-- before', contentBlocks);

  console.log('baseImageB64', baseImageB64 ? (baseImageB64.length > 100 ? baseImageB64.substring(0, 100) + '...' : baseImageB64) : 'none');
  if (baseImageB64) {
    const url = typeof baseImageB64 === 'string' && baseImageB64.startsWith('data:') ? baseImageB64 : `data:image/png;base64,${baseImageB64}`;
    contentBlocks.push({ type: 'image_url', image_url: { url } });
  } else {
    return Promise.reject(new Error('Base image is required for editing'));
  }
console.log('contentBlocks-- After', contentBlocks);
  const messages = [
    {
      role: 'user',
      content: contentBlocks,
    },
  ];

  console.log('messages:', messages);

  try {
    console.log('calling OpenAI image model', { model: modelForOpenAI });

    // retry loop for transient errors (429 rate limits, 5xx)
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const maxAttempts = 4;
    let attempt = 0;
    let resp: any = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        resp = await client.chat.completions.create({ model: modelForOpenAI, messages } as any);
        break; // success
      } catch (err) {
        const status = (err as any)?.response?.status || (err as any)?.status || null;
        const isRate = status === 429 || /rate limit|429/i.test((err as any)?.message || '');
        const isServerErr = status >= 500 && status < 600;
        // If transient, retry with exponential backoff + jitter
        if ((isRate || isServerErr) && attempt < maxAttempts) {
          const base = 500 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 300);
          const wait = base + jitter;
          console.warn(`Transient error (attempt ${attempt}) status=${status} retrying after ${wait}ms`, err);
          // small sleep then retry
          // eslint-disable-next-line no-await-in-loop
          await sleep(wait);
          continue;
        }

        // Not a retryable error or max attempts reached — rethrow to outer catch
        throw err;
      }
    }

    if (!resp) {
      const e: any = new Error('Image generation failed after retries');
      e.code = 'RATE_LIMIT';
      throw e;
    }
    console.log('response from image model: -------------', resp);

    // Some providers return generated images in choices[0].message.images as an array of objects
    const respImages = (resp as any)?.choices?.[0]?.message?.images;
    if (Array.isArray(respImages) && respImages.length > 0) {
      for (const img of respImages) {
        try {
          // common shapes: { url: 'data:image/...base64,...' } or { data: 'base64...' } or { base64: '...' }
          if (typeof img === 'string') {
            const cleaned = extractBase64FromString(img);
            if (cleaned) return cleaned;
          }

          if (img && typeof img === 'object') {
            // handle img.image_url.url shape
            if (img.image_url && typeof img.image_url?.url === 'string') {
              const cleaned = extractBase64FromString(img.image_url.url);
              if (cleaned) return cleaned;
            }

            // also support some providers that put url/data/base64 at top level
            if (typeof img.url === 'string') {
              const cleaned = extractBase64FromString(img.url);
              if (cleaned) return cleaned;
            }
            if (typeof img.data === 'string') {
              const cleaned = extractBase64FromString(img.data);
              if (cleaned) return cleaned;
            }
            if (typeof img.base64 === 'string') {
              const cleaned = extractBase64FromString(img.base64);
              if (cleaned) return cleaned;
            }
            // some entries are { type: 'image_url', image_url: { url: 'data:...' } }
            if (img.type === 'image_url' && img.image_url && typeof img.image_url.url === 'string') {
              const cleaned = extractBase64FromString(img.image_url.url);
              if (cleaned) return cleaned;
            }
          }
        } catch (imgErr) {
          console.debug('error parsing respImages entry', imgErr);
        }
      }
    }

    // Try to locate base64 image data in known response shapes
    const candidates = (resp as any)?.candidates || (resp as any)?.output;
    const messageContent = (resp as any)?.choices?.[0]?.message?.content || candidates?.[0]?.content;

    // If the model returned an array of content blocks (e.g. [{type: 'image_url', image_url:{url: 'data:...'}}, ...])
    if (Array.isArray(messageContent)) {
      for (const part of messageContent) {
        try {
          // image_url blocks (OpenRouter / Vertex style)
          if (part && typeof part === 'object' && part.type === 'image_url' && typeof part.image_url?.url === 'string') {
            const cleaned = extractBase64FromString(part.image_url.url);
            if (cleaned) return cleaned;
          }

          // inlineData blocks
          if (part?.inlineData?.data && typeof part.inlineData.data === 'string') {
            const cleaned = extractBase64FromString(part.inlineData.data);
            if (cleaned) return cleaned;
          }

          // plain data field
          if (typeof part?.data === 'string') {
            const cleaned = extractBase64FromString(part.data);
            if (cleaned) return cleaned;
          }
        } catch (innerErr) {
          // ignore and continue scanning other parts
          console.debug('error parsing part while extracting image', innerErr);
        }
      }
    }

    // If messageContent is an object that directly contains inlineData or image_url
    if (messageContent && typeof messageContent === 'object' && !Array.isArray(messageContent)) {
      // direct inlineData
      if (messageContent.inlineData?.data && typeof messageContent.inlineData.data === 'string') {
        const cleaned = extractBase64FromString(messageContent.inlineData.data);
        if (cleaned) return cleaned;
      }
      // direct image_url
      if (messageContent.type === 'image_url' && typeof messageContent.image_url?.url === 'string') {
        const cleaned = extractBase64FromString(messageContent.image_url.url);
        if (cleaned) return cleaned;
      }
      // raw data
      if (typeof messageContent.data === 'string') {
        const cleaned = extractBase64FromString(messageContent.data);
        if (cleaned) return cleaned;
      }
    }

    // If messageContent is a string, try to extract base64 from it
    if (typeof messageContent === 'string') {
      const cleaned = extractBase64FromString(messageContent);
      if (cleaned) return cleaned;
    }
    // If we reach here, no image was found
    console.warn('OpenAI image call returned but no image data found', { model: modelForOpenAI, respSummary: (resp as any)?.choices?.[0] ?? null });
    throw new Error('OpenAI call returned no image data');
  } catch (openErr) {
    console.error('OpenAI image generation error', { message: (openErr as Error).message, stack: (openErr as Error).stack });
    throw openErr;
  }
}
