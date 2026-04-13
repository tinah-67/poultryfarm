import { importBootstrapData } from '../database/db';

const BACKUP_BASE_URL = 'https://broilerhub.onrender.com';

export const bootstrapDeviceLogin = async (email, password) => {
  const response = await fetch(`${BACKUP_BASE_URL}/bootstrap/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(email || '').trim().toLowerCase(),
      password,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Bootstrap login failed');
  }

  const payload = await response.json();
  const authenticatedUser = payload?.authenticatedUser;
  const bootstrapData = payload?.bootstrapData;

  if (!authenticatedUser) {
    throw new Error('Bootstrap payload was incomplete');
  }

  await importBootstrapData(authenticatedUser, bootstrapData);

  return authenticatedUser;
};
