import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

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

const defaultRoleHelp = {
  title: 'User Help',
  items: [
    'Use the dashboard to open the part of the system you need.',
    'Refresh the dashboard when you want the app to retry backup sync.',
    'Record activities carefully so reports and reminders stay accurate.',
  ],
};

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

export default function HelpScreen({ route, extraBottomPadding = 0 }) {
  const userId = route?.params?.userId;
  const helpMode = route?.params?.mode || 'general';
  const [currentUser, setCurrentUser] = useState(null);

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

  if (helpMode === 'login') {
    return (
      <ScreenBackground scroll contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}>
        <Text style={styles.title}>Login Help</Text>
        <Text style={styles.subtitle}>Quick guidance for signing in</Text>

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

  return (
    <ScreenBackground scroll contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}>
      <Text style={styles.title}>Help</Text>
      <Text style={styles.subtitle}>
        {roleLabel
          ? `Guidance for ${roleLabel} users`
          : 'Quick guidance for using the app'}
      </Text>

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
});
