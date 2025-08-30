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

    for (let i = 0; i < 3; i++) {
      // create ratio-specific prompts
      const baseVariant = `${rewritten} Variation ${i + 1}: focus on strong subject separation and bold typography.`;
      const promptsByRatio = {
        horizontal: `${baseVariant} Generate for horizontal (16:9) composition.`,
        vertical: `${baseVariant} Generate for vertical (9:16) composition.`,
        square: `${baseVariant} Generate for square (1:1) composition.`,
      } as const;

      try {
        // Run the three size requests in parallel to reduce latency
        const tasks = [
          generateImageWithVertex(promptsByRatio.horizontal, baseImageB64, sizes.horizontal),
          generateImageWithVertex(promptsByRatio.vertical, baseImageB64, sizes.vertical),
          generateImageWithVertex(promptsByRatio.square, baseImageB64, sizes.square),
        ];

        const results = await Promise.allSettled(tasks);

        const settled = results.map((r) => (r.status === 'fulfilled' ? (r as PromiseFulfilledResult<string>).value : null));

        // If any task rejected, return the error to the client so UI can surface it
        const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        if (rejected) {
          const reason = rejected.reason as any;
          const errMessage = reason?.message || String(reason) || 'Unknown model error';
          const errCode = reason?.code || reason?.status || null;
          console.error('Model generation error detected, returning to client', { errMessage, errCode, reason });
          return NextResponse.json({ error: { message: errMessage, code: errCode, details: reason } }, { status: 502 });
        }

        // Basic validation: ensure result looks like base64 (only chars and long enough)
        const isProbablyBase64 = (s: string | null) => typeof s === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s+/g, '').length > 200;

        const [horizontalB64, verticalB64, squareB64] = settled.map((val) => (isProbablyBase64(val) ? val!.replace(/\s+/g, '') : null));

        console.log('Parallel generation results for variant', i + 1, {
          horizontal: !!horizontalB64,
          vertical: !!verticalB64,
          square: !!squareB64,
        });

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
