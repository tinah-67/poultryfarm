import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DashboardScreen from './DashboardScreen';
import NotificationsScreen from './NotificationsScreen';
import HelpScreen from './HelpScreen';

// Defines the bottom tabs available after login.
const TAB_CONFIG = [
  { key: 'dashboard', label: 'Dashboard', icon: '\u2302' },
  { key: 'notifications', label: 'Reminders', icon: '\u25A3' },
  { key: 'help', label: 'Help', icon: '?' },
];

// Hosts the dashboard, reminders, and help screens behind a persistent bottom tab bar.
export default function HomeShellScreen({ navigation, route }) {
  // Tracks the active tab and the signed-in user id shared by each child screen.
  const userId = route?.params?.userId;
  const requestedTab = route?.params?.activeTab;
  const [activeTab, setActiveTab] = useState(requestedTab || 'dashboard');

  // Responds to navigation requests that ask the shell to open a specific tab.
  useEffect(() => {
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, requestedTab]);

  // Passes the current user id through to whichever tab screen is active.
  const sharedRoute = useMemo(
    () => ({
      ...route,
      params: {
        ...route?.params,
        userId,
      },
    }),
    [route, userId]
  );

  // Keeps child screen props consistent across the tab switcher.
  const screenProps = {
    navigation,
    route: sharedRoute,
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Renders only the currently selected tab content. */}
        {activeTab === 'dashboard' ? (
          <DashboardScreen {...screenProps} showBottomTabs />
        ) : null}
        {activeTab === 'notifications' ? (
          <NotificationsScreen {...screenProps} extraBottomPadding={104} />
        ) : null}
        {activeTab === 'help' ? (
          <HelpScreen {...screenProps} extraBottomPadding={104} />
        ) : null}
      </View>

      {/* Renders the bottom tab bar. */}
      <View style={styles.tabBar}>
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              activeOpacity={0.85}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabIcon, isActive ? styles.tabIconActive : null]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shell layout and tab bar styles.
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIcon: {
    color: '#94a3b8',
    fontSize: 21,
    fontWeight: '700',
  },
  tabIconActive: {
    color: '#dcfce7',
  },
  tabLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#dcfce7',
  },
});
