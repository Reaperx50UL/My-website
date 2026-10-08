import { MetadataRoute } from 'next';
import { webLabData } from '@/data/profile';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://YOUR_DOMAIN_HERE'; // Replace with real URL

  const webLabRoutes = webLabData.map((project) => ({
    url: `${baseUrl}/web-lab/${project.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/web-lab`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...webLabRoutes,
  ];
}
