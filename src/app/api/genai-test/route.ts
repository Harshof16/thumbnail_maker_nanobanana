/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
  // Dynamically import the SDK so the app still runs without the package if not used.
  const mod = await import('@google/genai');
  const GoogleGenAI = (mod as unknown) as { GoogleGenAI?: unknown };
  const SDKConstructor = (GoogleGenAI as any)?.GoogleGenAI || (mod as any)?.default?.GoogleGenAI || (mod as any)?.default || (mod as any);
  if (!SDKConstructor) throw new Error('GoogleGenAI SDK not available');

  const ai = new SDKConstructor({});

    // read JSON body for a prompt; fallback sample if none provided
    const body = await req.json().catch(() => ({}));
    const prompt = body.prompt || 'Create a stylized image of a nano-banana on a plate in a dramatic studio light.';

    const contents: Array<Record<string, unknown>> = [{ text: prompt }];

    // optionally accept base64 image in body to include as inlineData
    if (body.base64Image) {
      contents.push({ inlineData: { mimeType: 'image/png', data: body.base64Image } });
    }

    // Call the SDK
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const response = await ai.models.generateContent({
      model: process.env.GOOGLE_IMAGE_MODEL || 'gemini-2.5-flash-image-preview',
      contents,
    });

    // parse parts for inlineData or text
    const parts = (response as any)?.candidates?.[0]?.content?.parts as unknown[] | undefined;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const p = part as Record<string, unknown>;
        const inline = p.inlineData as { data?: unknown } | undefined;
        if (inline && typeof inline.data === 'string') {
          return NextResponse.json({ type: 'image', data: inline.data });
        }
      }
      // fallback: return text parts
      const texts = parts.map((p) => (p as any)?.text).filter(Boolean);
      return NextResponse.json({ type: 'text', data: texts.join('\n') });
    }

    return NextResponse.json({ message: 'No content returned from GenAI' }, { status: 500 });
  } catch (err) {
    console.error('genai-test error', err);
    return NextResponse.json({ message: (err as Error).message || 'Error calling GenAI' }, { status: 500 });
  }
}
