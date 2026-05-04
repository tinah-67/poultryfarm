import { importBootstrapData } from '../database/db';

// Uses the backup server as the source for restoring account data onto a fresh device.
const BACKUP_BASE_URL = 'http://192.168.100.26:3000';

// Authenticates against the backup server and imports the returned local database records.
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
