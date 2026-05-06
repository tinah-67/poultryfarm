import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

// Answers common questions users may have before contacting support.
const loginFaqItems = [
  'Can I create a staff account from the login screen? No. Public registration creates owner accounts, and owners create staff accounts after signing in.',
  'What should I do if my account is not found? Check the email address first, then try again when the device can reach the backup server.',
  'Can I reset my password without internet? Yes, if your account and recovery question are already saved on this device.',
];

const appFaqItems = [
  'Do I need internet to use the app? No. Records are saved on the device first and backed up when the server is reachable.',
  'Why are some buttons hidden or disabled? Your owner, manager, or worker role controls which actions you can use.',
  'Why do reports look incomplete? Confirm each record was saved under the correct farm and batch, then refresh the report.',
  'Can deleted records be restored from the list? Deleted farms, batches, and records are hidden to preserve history for backup sync.',
];

const CONTACT_EMAIL = 'c2515124@gmail.com';
const CONTACT_PHONE = '+254114906046';
const CONTACT_WHATSAPP_NUMBER = '254114906046';

const contactMethods = [
  {
    label: 'Email',
    value: CONTACT_EMAIL,
    url: `mailto:${CONTACT_EMAIL}`,
    fallbackMessage: `Email ${CONTACT_EMAIL} for help.`,
  },
  {
    label: 'Call',
    value: CONTACT_PHONE,
    url: `tel:${CONTACT_PHONE}`,
    fallbackMessage: `Call ${CONTACT_PHONE} for help.`,
  },
  {
    label: 'WhatsApp',
    value: CONTACT_PHONE,
    url: `https://wa.me/${CONTACT_WHATSAPP_NUMBER}`,
    fallbackMessage: `Open WhatsApp and message ${CONTACT_PHONE} for help.`,
  },
];

const contactItems = [
  `Email: ${CONTACT_EMAIL}`,
  `Phone: ${CONTACT_PHONE}`,
  `WhatsApp: ${CONTACT_PHONE}`,
  'Include your farm name, batch, screen name, and any error message when asking for help.',
];

// Opens the selected contact method through the device's installed apps.
const openContactMethod = async (url, fallbackMessage) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert('Could not open contact option', fallbackMessage);
  }
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

// Renders direct contact details and quick actions for email, phone, and WhatsApp.
const ContactCard = () => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Contact Us</Text>
    {contactItems.map(item => (
      <Text key={item} style={styles.sectionItem}>
        {`\u2022 ${item}`}
      </Text>
    ))}

    <View style={styles.contactActions}>
      {contactMethods.map(method => (
        <TouchableOpacity
          key={method.label}
          style={styles.contactAction}
          activeOpacity={0.85}
          onPress={() => openContactMethod(method.url, method.fallbackMessage)}
        >
          <Text style={styles.contactActionLabel}>{method.label}</Text>
          <Text style={styles.contactActionValue}>{method.value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// Renders a large menu action for choosing the type of help to open.
const HelpMenuButton = ({ title, detail, onPress }) => (
  <TouchableOpacity style={styles.menuButton} activeOpacity={0.85} onPress={onPress}>
    <Text style={styles.menuButtonTitle}>{title}</Text>
    <Text style={styles.menuButtonDetail}>{detail}</Text>
  </TouchableOpacity>
);

// Renders a compact button used to return from a detail help panel.
const BackToHelpButton = ({ onPress }) => (
  <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={onPress}>
    <Text style={styles.backButtonText}>Back to Help</Text>
  </TouchableOpacity>
);

// Displays login help or role-aware app help, plus an optional online user manual link.
export default function HelpScreen({ route, extraBottomPadding = 0 }) {
  // Tracks help mode, current user role, and the selected in-app help panel.
  const userId = route?.params?.userId;
  const helpMode = route?.params?.mode || 'general';
  const [currentUser, setCurrentUser] = useState(null);
  const [activeHelpPanel, setActiveHelpPanel] = useState('menu');

  // Rechecks availability and opens the online user manual in the browser.
  const handleOpenOnlineHelp = useCallback(async () => {
    try {
      const isAvailable = await checkOnlineHelpAvailable();

      if (!isAvailable) {
        Alert.alert('Online user manual unavailable', 'Connect to the internet and check again before opening the user manual.');
        return;
      }

      await openOnlineHelp();
    } catch (error) {
      Alert.alert('Could not open user manual', error?.message || 'Try again when internet is available.');
    }
  }, []);

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

  // Returns to the main help menu when the screen mode changes.
  useEffect(() => {
    setActiveHelpPanel('menu');
  }, [helpMode, userId]);

  const roleLabel = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : null;

  const roleSection = useMemo(
    () => roleHelpContent[currentUser?.role] || defaultRoleHelp,
    [currentUser?.role]
  );

  const isLoginHelp = helpMode === 'login';
  const mainTitle = isLoginHelp ? 'Login Help' : 'Help';
  const mainSubtitle = isLoginHelp
    ? 'Choose the type of help you need'
    : roleLabel
      ? `Guidance for ${roleLabel} users`
      : 'Choose the type of help you need';
  const offlineSubtitle = isLoginHelp
    ? 'Quick guidance for signing in'
    : roleLabel
      ? `Offline guidance for ${roleLabel} users`
      : 'Offline guidance for using the app';
  const faqItems = isLoginHelp ? loginFaqItems : appFaqItems;

  const renderMenu = () => (
    <>
      <Text style={styles.title}>{mainTitle}</Text>
      <Text style={styles.subtitle}>{mainSubtitle}</Text>

      <View style={styles.menuCard}>
        <HelpMenuButton
          title="Offline Help"
          detail={isLoginHelp ? 'Open sign-in guidance saved in the app.' : 'Open role-based app guidance saved on this device.'}
          onPress={() => setActiveHelpPanel('offline')}
        />
        <HelpMenuButton
          title="Online User Manual"
          detail="Open the full user manual in your browser."
          onPress={handleOpenOnlineHelp}
        />
        <HelpMenuButton
          title="FAQs"
          detail="Open answers to common questions."
          onPress={() => setActiveHelpPanel('faqs')}
        />
      </View>

      <ContactCard />
    </>
  );

  const renderLoginOfflineHelp = () => (
    <>
      <BackToHelpButton onPress={() => setActiveHelpPanel('menu')} />
      <Text style={styles.title}>Offline Help</Text>
      <Text style={styles.subtitle}>{offlineSubtitle}</Text>

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
    </>
  );

  const renderAppOfflineHelp = () => (
    <>
      <BackToHelpButton onPress={() => setActiveHelpPanel('menu')} />
      <Text style={styles.title}>Offline Help</Text>
      <Text style={styles.subtitle}>{offlineSubtitle}</Text>

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
    </>
  );

  const renderFaqs = () => (
    <>
      <BackToHelpButton onPress={() => setActiveHelpPanel('menu')} />
      <Text style={styles.title}>FAQs</Text>
      <Text style={styles.subtitle}>Answers to common questions</Text>
      <SectionCard title="FAQs" items={faqItems} />
    </>
  );

  const renderContent = () => {
    if (activeHelpPanel === 'offline') {
      return isLoginHelp ? renderLoginOfflineHelp() : renderAppOfflineHelp();
    }

    if (activeHelpPanel === 'faqs') {
      return renderFaqs();
    }

    return renderMenu();
  };

  // Renders the selected help panel.
  return (
    <ScreenBackground scroll contentContainerStyle={[styles.container, extraBottomPadding ? { paddingBottom: extraBottomPadding } : null]}>
      {renderContent()}
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
  menuCard: {
    gap: 12,
    marginBottom: 16,
  },
  menuButton: {
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#16a34a',
  },
  menuButtonTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  menuButtonDetail: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  // Help card and bullet text styles.
  sectionCard: {
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    borderRadius: 8,
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
  // Contact action button styles.
  contactActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  contactAction: {
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactActionLabel: {
    color: '#166534',
    fontWeight: '700',
    marginBottom: 3,
  },
  contactActionValue: {
    color: '#334155',
    fontSize: 12,
  },
});
