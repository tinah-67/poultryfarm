import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { checkOnlineHelpAvailable, openOnlineHelp } from '../services/onlineHelp';

// Provides role-specific offline help content for signed-in users.
const roleHelpContent = {
  owner: {
    title: 'Owner Help',
    items: [
      'Use Farm Management to add farms and review overall farm performance.',
      'Create staff accounts so workers and managers can record daily activities.',
      'Check Reports and Reminders often to monitor feed, mortality, vaccination, sales, and expenses.',
    ],
  },
  manager: {
    title: 'Manager Help',
    items: [
      'Use Farm Management to view farms, record farm expenses, and review farm performance.',
      'Use Batch Management to open a farm and manage its batches and daily records.',
      'Use Reports and Reminders to follow up on operational issues quickly.',
    ],
  },
  worker: {
    title: 'Worker Help',
    items: [
      'Use Batch Management to open your farm and record feed, mortality, and vaccinations for the right batch.',
      'Use Reminders to focus on feed, mortality, and vaccination alerts that need attention.',
      'Use Reports to review your feed, mortality, and vaccination records when needed.',
    ],
  },
};

// Provides fallback offline help when no user role is available.
const defaultRoleHelp = {
  title: 'User Help',
  items: [
    'Use the dashboard to open the part of the system you need.',
    'Refresh the dashboard when you want the app to retry backup sync.',
    'Record activities carefully so reports and reminders stay accurate.',
  ],
};

// Renders a titled help card with bullet-point guidance.
const SectionCard = ({ title, items }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {items.map(item => (
      <Text key={item} style={styles.sectionItem}>
        {`\u2022 ${item}`}
      </Text>
    ))}
  </View>
);

// Maps online manual availability states to user-facing messages.
const onlineHelpMessages = {
  checking: 'Checking online user manual availability...',
  available: 'The online user manual is available. It will open in your browser.',
  unavailable: 'The online user manual is unavailable right now. Offline help below is still available.',
};

// Shows the online manual action while preserving offline help as the fallback.
const OnlineHelpCard = ({ status, onCheck, onOpen }) => {
  const isChecking = status === 'checking';
  const isAvailable = status === 'available';

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Online User Manual</Text>
      <Text style={styles.sectionDescription}>
        {onlineHelpMessages[status] || onlineHelpMessages.unavailable}
      </Text>

      <View style={styles.onlineHelpActions}>
        <TouchableOpacity
          style={[styles.primaryAction, !isAvailable ? styles.disabledAction : null]}
          activeOpacity={0.85}
          disabled={!isAvailable}
          onPress={onOpen}
        >
          <Text style={[styles.primaryActionText, !isAvailable ? styles.disabledActionText : null]}>
            Open User Manual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryAction, isChecking ? styles.disabledAction : null]}
          activeOpacity={0.85}
          disabled={isChecking}
          onPress={onCheck}
        >
          <Text style={[styles.secondaryActionText, isChecking ? styles.disabledActionText : null]}>
            {isChecking ? 'Checking...' : 'Check Again'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Displays login help or role-aware app help, plus an optional online user manual link.
export default function HelpScreen({ route, extraBottomPadding = 0 }) {
  // Tracks help mode, current user role, and online manual availability.
  const userId = route?.params?.userId;
  const helpMode = route?.params?.mode || 'general';
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineHelpStatus, setOnlineHelpStatus] = useState('checking');

  // Checks whether the online user manual can be reached.
  const refreshOnlineHelpStatus = useCallback(async () => {
    setOnlineHelpStatus('checking');

    try {
      const isAvailable = await checkOnlineHelpAvailable();
      setOnlineHelpStatus(isAvailable ? 'available' : 'unavailable');
    } catch (error) {
      console.log('Online help unavailable:', error);
      setOnlineHelpStatus('unavailable');
    }
  }, []);

  // Rechecks availability and opens the online user manual in the browser.
  const handleOpenOnlineHelp = useCallback(async () => {
    try {
      setOnlineHelpStatus('checking');
      const isAvailable = await checkOnlineHelpAvailable();

      if (!isAvailable) {
        setOnlineHelpStatus('unavailable');
        Alert.alert('Online user manual unavailable', 'Connect to the internet and check again before opening the user manual.');
        return;
      }

      setOnlineHelpStatus('available');
      await openOnlineHelp();
    } catch (error) {
      setOnlineHelpStatus('unavailable');
      Alert.alert('Could not open user manual', error?.message || 'Try again when internet is available.');
    }
  }, []);

  // Checks online manual availability when the Help screen loads.
  useEffect(() => {
    refreshOnlineHelpStatus();
  }, [refreshOnlineHelpStatus]);

  // Loads the signed-in user unless the screen is being used for login help.
  useEffect(() => {
    if (helpMode === 'login') {
      setCurrentUser(null);
      return;
    }

    if (!userId) {
      setCurrentUser(null);
      return;
    }

    getUserById(userId, user => {
      setCurrentUser(user);
    });
  }, [helpMode, userId]);

  const roleLabel = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : null;

  const roleSection = useMemo(
    () => roleHelpContent[currentUser?.role] || defaultRoleHelp,
    [currentUser?.role]
  );

  // Renders the help variant used from the login screen.
  if (helpMode === 'login') {
    return (
      <ScreenBackground scroll contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}>
        <Text style={styles.title}>Login Help</Text>
        <Text style={styles.subtitle}>Quick guidance for signing in</Text>

        <OnlineHelpCard
          status={onlineHelpStatus}
          onCheck={refreshOnlineHelpStatus}
          onOpen={handleOpenOnlineHelp}
        />

        <SectionCard
          title="Before You Login"
          items={[
            'Enter the same email address that was used when the account was created.',
            'Email is checked without case sensitivity, so upper or lower case does not matter.',
            'Make sure the device has the correct app data if you recently reinstalled the app.',
          ]}
        />

        <SectionCard
          title="Password Tips"
          items={[
            'Enter the exact password linked to that account.',
            'Use the eye button to show the password if you want to confirm what you typed.',
            'If the app says the password is incorrect, check the password and try again.',
          ]}
        />

        <SectionCard
          title="Remember Me"
          items={[
            'Turn on Remember Me if you want the app to keep your session during that app use period.',
            'If you do not select Remember Me, the app signs in only for the current session.',
          ]}
        />

        <SectionCard
          title="If Login Fails"
          items={[
            'If the account is not found on the device, the app may try to restore it from backup when internet is available.',
            'If backup restore also fails, confirm the backend is reachable and try again shortly.',
            'If you need a new owner account, use the Register option on the login screen.',
          ]}
        />
      </ScreenBackground>
    );
  }

  // Renders the signed-in help variant with role-aware guidance.
  return (
    <ScreenBackground scroll contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}>
      <Text style={styles.title}>Help</Text>
      <Text style={styles.subtitle}>
        {roleLabel
          ? `Guidance for ${roleLabel} users`
          : 'Quick guidance for using the app'}
      </Text>

      <OnlineHelpCard
        status={onlineHelpStatus}
        onCheck={refreshOnlineHelpStatus}
        onOpen={handleOpenOnlineHelp}
      />

      <SectionCard
        title="Getting Started"
        items={[
          'Open the dashboard and choose the area you want to work in.',
          'Select the correct farm and batch before recording any activity.',
          'Pull down to refresh when you want the app to retry backup sync and refresh alerts.',
        ]}
      />

      <SectionCard title={roleSection.title} items={roleSection.items} />

      <SectionCard
        title="Common Tasks"
        items={[
          'Record a batch first before adding feed, mortality, vaccination, expense, or sales records.',
          'Record farm expenses through Farm Management, then choose the farm before saving the expense.',
          'Open reports when you need filtered summaries by period, farm, or batch.',
        ]}
      />

      <SectionCard
        title="Troubleshooting"
        items={[
          'If login fails, confirm the email and password carefully and try again.',
          'If backup sync does not complete, confirm the device can reach the backend and then refresh the dashboard.',
          'If reports look incomplete, check that records were saved under the correct farm and batch.',
        ]}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Page layout and heading styles.
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#e2e8f0',
    marginBottom: 18,
  },
  // Help card and bullet text styles.
  sectionCard: {
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionItem: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  // Online manual action button styles.
  onlineHelpActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryAction: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryActionText: {
    color: '#166534',
    fontWeight: '700',
  },
  disabledAction: {
    backgroundColor: '#e2e8f0',
    borderColor: '#cbd5e1',
  },
  disabledActionText: {
    color: '#64748b',
  },
});
