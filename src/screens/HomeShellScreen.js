import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DashboardScreen from './DashboardScreen';
import NotificationsScreen from './NotificationsScreen';
import HelpScreen from './HelpScreen';

const TAB_CONFIG = [
  { key: 'dashboard', label: 'Dashboard', icon: '\u2302' },
  { key: 'notifications', label: 'Notifications', icon: '\u25A3' },
  { key: 'help', label: 'Help', icon: '?' },
];

export default function HomeShellScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const requestedTab = route?.params?.activeTab;
  const [activeTab, setActiveTab] = useState(requestedTab || 'dashboard');

  useEffect(() => {
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, requestedTab]);

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

  const screenProps = {
    navigation,
    route: sharedRoute,
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
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
