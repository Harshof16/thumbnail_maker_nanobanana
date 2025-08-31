import { NextResponse } from 'next/server';
import { buildSystemPrompt, rewritePrompt as rewriteWithLLM, generateImageWithVertex } from '@/lib/prompt';

async function fileToBase64(file: Blob): Promise<string> {
  // Server-side conversion: read the file's arrayBuffer and convert to base64 via Buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString('base64');
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const payload = form.get('payload') as string | null;
    const file = form.get('image') as File | null;

    const parsed = payload ? JSON.parse(payload) : {};
    const userResponses = parsed.userResponses || {};
    const placement = parsed.placement || userResponses.placement || 'center';

    // Build the system prompt from questionnaire
    const systemPrompt = buildSystemPrompt(userResponses, placement);
    console.log('systemPrompt:', systemPrompt);
    
    // Rewrite / expand the prompt using available LLM helper
    const rewritten = await rewriteWithLLM(systemPrompt);

    // Sizes for different ratios
    const sizes = {
      horizontal: '1280x720',
      vertical: '720x1280',
      square: '1080x1080',
    } as const;

    // Convert uploaded file to base64 if present
    let baseImageB64: string | undefined;
    if (file) {
      try {
        baseImageB64 = await fileToBase64(file);
      } catch (e) {
        console.warn('Failed to convert file to base64', e);
      }
    }

    // For each of three variations, call the image model. We'll produce 3 thumbnails.
    type Thumbnail = { id: string; prompt: string; horizontal: string; vertical: string; square: string };
    const thumbnails: Thumbnail[] = [];

    // Add dynamic variation-level focuses so each variation differs
    const variationFocuses = [
      'focus on strong subject separation and bold typography',
      'focus on dramatic lighting and energetic color contrasts',
      'focus on a close-up expressive subject and minimal on-screen text'
    ];

    for (let i = 0; i < 3; i++) {
      // create ratio-specific prompts; each variation has a different focus
      const variationFocus = variationFocuses[i] ?? `variation ${i + 1}`;
      const baseVariant = `${rewritten} Variation ${i + 1}: ${variationFocus}.`;
      const promptsByRatio = {
        horizontal: `${baseVariant} Generate for horizontal (16:9) composition. Emphasize landscape framing, negative space on the right, and large headline text area.`,
        vertical: `${baseVariant} Generate for vertical (9:16) composition. Emphasize tall framing, subject-centered or top-aligned composition, and readable headline placement for mobile.`,
        square: `${baseVariant} Generate for square (1:1) composition. Emphasize centered subject, balanced negative space, and typography that reads in square crops.`,
      } as const;

      try {
  // Call the image model once per variant and explicitly request 3 images with distinct
  // aspect ratios so the model returns outputs for horizontal, vertical and square.
  // Build a structured prompt that provides a distinct sub-prompt per ratio and asks
  // the model to return a JSON object with three separate image values. This reduces
  // the chance the model composes all variants into a single grid image.
  const combinedPrompt = `
${baseVariant}
Please produce three separate images for this variation. Do NOT place multiple aspect
ratios inside a single composited image or grid—each output must be a separate image.

Provide the images as a JSON object with exact keys: "horizontal", "vertical", "square".
Each value should be a data URL (data:image/jpeg;base64,...) or a raw base64 string. Do not
include additional explanatory text or analysis outside the JSON object.

Sub-prompts (use these to render each image):
HORIZONTAL (16:9, ${sizes.horizontal}): ${promptsByRatio.horizontal}
VERTICAL  (9:16, ${sizes.vertical}): ${promptsByRatio.vertical}
SQUARE    (1:1,  ${sizes.square}): ${promptsByRatio.square}

Return strictly a JSON object like {"horizontal":"data:...","vertical":"data:...","square":"data:..."}.
`;

  const result = await generateImageWithVertex(combinedPrompt, baseImageB64, sizes.horizontal);

        // result may be string or string[]
        const isProbablyBase64 = (s: string | null) => typeof s === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s+/g, '').length > 200;

        let horizontalB64: string | null = null;
        let verticalB64: string | null = null;
        let squareB64: string | null = null;

        if (Array.isArray(result)) {
          const arr = result as string[];
          horizontalB64 = isProbablyBase64(arr[0]) ? arr[0].replace(/\s+/g, '') : null;
          verticalB64 = isProbablyBase64(arr[1]) ? arr[1].replace(/\s+/g, '') : null;
          squareB64 = isProbablyBase64(arr[2]) ? arr[2].replace(/\s+/g, '') : null;
        } else if (typeof result === 'string') {
          // single string returned; assume it's for horizontal and fall back placeholders for others
          horizontalB64 = isProbablyBase64(result) ? result.replace(/\s+/g, '') : null;
        }

        console.log('Generation results for variant', i + 1, { horizontal: !!horizontalB64, vertical: !!verticalB64, square: !!squareB64 });

        const makeDataUrl = (b64: string | null, fallback: string) => b64 ? `data:image/jpeg;base64,${b64}` : fallback;

        thumbnails.push({
          id: `thumb_${i + 1}`,
          prompt: baseVariant,
          horizontal: makeDataUrl(horizontalB64, `https://via.placeholder.com/1280x720/111827/ef4444?text=Thumb+${i + 1}+16:9`),
          vertical: makeDataUrl(verticalB64, `https://via.placeholder.com/720x1280/0f172a/06b6d4?text=Thumb+${i + 1}+9:16`),
          square: makeDataUrl(squareB64, `https://via.placeholder.com/1080x1080/071327/60a5fa?text=Thumb+${i + 1}+1:1`),
        });
      } catch (err) {
        const e = err as { response?: { data?: unknown }; message?: string };
        console.error('Image generation loop failed for variant', i + 1, e?.response?.data || e?.message || err);
        // Fallback to placeholders if something goes wrong
        thumbnails.push({
          id: `thumb_${i + 1}`,
          prompt: baseVariant,
          horizontal: `https://via.placeholder.com/1280x720/111827/ef4444?text=Thumb+${i + 1}+16:9`,
          vertical: `https://via.placeholder.com/720x1280/0f172a/06b6d4?text=Thumb+${i + 1}+9:16`,
          square: `https://via.placeholder.com/1080x1080/071327/60a5fa?text=Thumb+${i + 1}+1:1`,
        });
      }
    }

    return NextResponse.json({ thumbnails, rewrittenPrompt: rewritten });
  } catch (err) {
    console.error('generatethumbnails error', err);
    return NextResponse.json({ message: 'Error generating thumbnails' }, { status: 500 });
  }
}
