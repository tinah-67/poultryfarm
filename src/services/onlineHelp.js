import { Linking } from 'react-native';
import { ONLINE_HELP_REQUEST_TIMEOUT_MS, ONLINE_HELP_URL } from '../constants/onlineHelp';

const withTimeout = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Online user manual request timed out.'));
      }, timeoutMs);
    }),
  ]);

export const checkOnlineHelpAvailable = async () => {
  const response = await withTimeout(
    fetch(ONLINE_HELP_URL, {
      method: 'GET',
      headers: { Accept: 'text/html,application/json' },
    }),
    ONLINE_HELP_REQUEST_TIMEOUT_MS
  );

  return response.ok;
};

export const openOnlineHelp = async () => {
  await Linking.openURL(ONLINE_HELP_URL);
};
