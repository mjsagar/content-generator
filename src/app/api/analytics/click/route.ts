import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (slug) {
      const page = await db.orm.public.Page.where({ slug }).first();
      if (page) {
        // Average ad/affiliate click value estimated at $0.25
        await db.orm.public.Page.where({ id: page.id }).update({
          revenue: Number((page.revenue + 0.25).toFixed(2))
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking ad click:', error);
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }
}
