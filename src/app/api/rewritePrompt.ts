import { NextResponse } from 'next/server';
import { buildSystemPrompt, rewritePrompt as rewriteWithLLM } from '@/lib/prompt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userResponses } = body;

    const systemPrompt = buildSystemPrompt(userResponses || {}, userResponses?.placement || 'center');
    const rewritten = await rewriteWithLLM(systemPrompt);

    return NextResponse.json({ rewrittenPrompt: rewritten });
  } catch (err) {
    console.error('rewritePrompt error', err);
    return NextResponse.json({ message: 'Error rewriting prompt' }, { status: 500 });
  }
}