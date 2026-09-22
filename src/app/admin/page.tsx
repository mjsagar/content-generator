import { db } from '@/prisma/db';
import type { Models } from '@/prisma/contract.d';
import { listAvailableGroqModels, getSelectedGroqModels } from '@/lib/services/groq';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const pages = process.env.DATABASE_URL ? await db.orm.public.Page.all() : [];

  const totalViews = pages.reduce((sum: number, page: Models.public_Page) => sum + (page.views || 0), 0);
  const totalRevenue = pages.reduce((sum: number, page: Models.public_Page) => sum + (page.revenue || 0), 0);
  const totalTrends = pages.filter((p: Models.public_Page) => p.type === 'trend').length;
  const totalNiches = pages.filter((p: Models.public_Page) => p.type === 'niche').length;

  let config = null;
  let rotationConfig = null;
  if (process.env.DATABASE_URL) {
    config = await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).first();
    if (!config) {
      config = await db.orm.public.Config.create({
        key: 'GENERATION_INTERVAL_MINUTES',
        value: '60'
      });
    }

    rotationConfig = await db.orm.public.Config.where({ key: 'GROQ_MODEL_ROTATION_INDEX' }).first();
  }

  const [availableModels, selectedModels] = await Promise.all([
    listAvailableGroqModels(),
    getSelectedGroqModels()
  ]);

  const initialRotationIndex = parseInt(rotationConfig?.value || '0', 10) || 0;

  const plainPages = pages.map((p: Models.public_Page) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    category: p.category,
    views: p.views || 0,
    revenue: p.revenue || 0,
    createdAt: new Date(p.createdAt).toISOString()
  }));

  return (
    <AdminDashboardClient
      initialPages={plainPages}
      initialConfigValue={config?.value || '60'}
      initialAvailableModels={availableModels}
      initialSelectedModels={selectedModels}
      initialRotationIndex={initialRotationIndex}
      stats={{
        totalViews,
        totalRevenue,
        totalTrends,
        totalNiches
      }}
    />
  );
}
