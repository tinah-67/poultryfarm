import { Linking } from 'react-native';
import { ONLINE_HELP_REQUEST_TIMEOUT_MS, ONLINE_HELP_URL } from '../constants/onlineHelp';

// Adds a timeout around network checks so the Help screen does not wait forever.
const withTimeout = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Online user manual request timed out.'));
      }, timeoutMs);
    }),
  ]);

// Checks whether the online user manual can be reached before enabling the button.
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

// Opens the online user manual in the device browser.
export const openOnlineHelp = async () => {
  await Linking.openURL(ONLINE_HELP_URL);
};
