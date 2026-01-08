import database from '@/lib/db-connect';

export const getSiteUrl = async (): Promise<string> => {
  const settings = await database.getSettings();
  const url = settings?.websiteUrl?.trim();

  if (!url) {
    throw new Error('Website URL not configured in settings');
  }

  return url.replace(/\/$/, '');
};

export default getSiteUrl;
