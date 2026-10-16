import React, { useCallback, useRef, useState } from 'react';
import { Alert, Modal, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ImageBackground, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { clearRememberedSession, getUserById } from '../database/db';
import { syncPendingBackup } from '../services/backupSync';
import { syncDeviceNotificationsForUser } from '../services/localNotifications';

// Shows the main menu after login and starts background sync work.
export default function DashboardScreen({ navigation, route, showBottomTabs = false }) {
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [syncingBackup, setSyncingBackup] = useState(false);
  const syncingBackupRef = useRef(false);

  console.log('DASHBOARD userId:', userId);

  const loadUser = useCallback(() => {
    if (!userId) {
      setCurrentUser(null);
      return;
    }

    getUserById(userId, user => {
      setCurrentUser(user);
    });
  }, [userId]);

  const syncNotifications = useCallback((options = {}) => {
    if (!userId) {
      return;
    }

    syncDeviceNotificationsForUser(userId, options).catch(error => {
      console.log('Error syncing device notifications', error);
    });
  }, [userId]);

  const syncBackup = useCallback(async ({ showFeedback = false } = {}) => {
    if (syncingBackupRef.current) {
      return [];
    }

    try {
      syncingBackupRef.current = true;
      setSyncingBackup(true);
      const results = await syncPendingBackup();

      if (showFeedback) {
        const syncedCount = results.reduce((sum, item) => sum + Number(item.syncedCount || 0), 0);
        Alert.alert('Sync complete', syncedCount + ' record(s) synced to backup.');
      }

      return results;
    } catch (error) {
      console.log('Backup sync skipped:', error);

      if (showFeedback) {
        Alert.alert('Sync failed', error?.message || 'Could not sync backup right now.');
      }

      return [];
    } finally {
      syncingBackupRef.current = false;
      setSyncingBackup(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUser();
      syncNotifications();
      syncBackup();
    }, [loadUser, syncNotifications, syncBackup])
  );

  const handleLogout = () => {
    clearRememberedSession(() => {
      navigation.replace('Login');
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUser();
    syncNotifications({ force: true });
    Promise.resolve(syncBackup()).finally(() => {
      setRefreshing(false);
    });
  };

  const firstName = currentUser?.first_name;
  const isOwner = currentUser?.role === 'owner';
  const canAccessFarmManagement = ['owner', 'manager'].includes(currentUser?.role);
  const canRecordEggs = ['owner', 'worker'].includes(currentUser?.role);
  const canRecordSales = ['owner', 'manager'].includes(currentUser?.role);
  const quickActions = [
    ...(canRecordEggs ? [{ key: 'collectEggs', label: 'Collect Eggs', hint: "Record today's collection", color: '#15803d' }] : []),
    ...(canRecordSales ? [
      { key: 'sellEggs', label: 'Sell Eggs', hint: 'Record an egg sale', color: '#1d4ed8' },
      { key: 'sellBirds', label: 'Sell Birds', hint: 'Record a bird sale', color: '#7c3aed' },
    ] : []),
  ];

  const menuItems = [
    ...(canAccessFarmManagement
      ? [{ label: 'Farm Management', onPress: () => navigation.navigate('FarmManagement', { userId }) }]
      : []),
    ...(isOwner
      ? [{ label: 'Create Staff Account', onPress: () => navigation.navigate('Register', { ownerUserId: userId }) }]
      : []),
    { label: 'Manage Farms and Batches', onPress: () => navigation.navigate('ViewFarms', { userId, selectionMode: 'batch' }) },
    { label: 'Reports', onPress: () => navigation.navigate('Reports', { userId }) },
    {
      label: 'Reminders',
      onPress: () => showBottomTabs
        ? navigation.navigate('Home', { userId, activeTab: 'notifications' })
        : navigation.navigate('Notifications', { userId }),
    },
    ...(currentUser
      ? [{
          label: String(currentUser.recovery_question || '').trim() ? 'Update Recovery Question' : 'Set Recovery Question',
          onPress: () => navigation.navigate('RecoveryQuestion', { userId }),
        }]
      : []),
    {
      label: 'Help',
      onPress: () => showBottomTabs
        ? navigation.navigate('Home', { userId, activeTab: 'help' })
        : navigation.navigate('Help', { userId }),
    },
  ];

  const handleMenuItemPress = item => {
    setMenuVisible(false);
    item.onPress();
  };

  return (
    <ImageBackground
      source={require('../Broilers-Chickens.webp')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
          }
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>KIKO FARM</Text>
              {firstName ? <Text style={styles.subtitle}>Signed in as {firstName}</Text> : null}
              {syncingBackup ? <Text style={styles.syncStatus}>Syncing backup...</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Open dashboard menu"
            >
              <View style={styles.menuGlyph}>
                <View style={styles.menuGlyphLine} />
                <View style={styles.menuGlyphLine} />
                <View style={styles.menuGlyphLine} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionHeading}>
            <Text style={styles.quickActionTitle}>Quick actions</Text>
            <Text style={styles.quickActionSubtitle}>Choose a task, then choose a flock</Text>
          </View>
          <View style={styles.quickActionGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.key}
                style={[styles.quickActionButton, { backgroundColor: action.color }]}
                onPress={() => navigation.push('QuickRecord', { userId, action: action.key })}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                activeOpacity={0.84}
              >
                <Text style={styles.quickActionButtonTitle}>{action.label}</Text>
                <Text style={styles.quickActionButtonHint}>{action.hint}</Text>
              </TouchableOpacity>
            ))}
            {quickActions.length === 0 ? (
              <Text style={styles.quickActionSubtitle}>Loading your account permissions...</Text>
            ) : null}
          </View>
        </ScrollView>

        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <View style={styles.drawerOverlay}>
            <View style={styles.drawerPanel}>
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.drawerEyebrow}>KIKO FARM</Text>
                  <Text style={styles.drawerTitle}>Menu</Text>
                </View>
                <TouchableOpacity
                  style={styles.drawerCloseButton}
                  onPress={() => setMenuVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close menu"
                >
                  <Text style={styles.drawerCloseText}>X</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.drawerItems}>
                {menuItems.map(item => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.drawerItem}
                    onPress={() => handleMenuItemPress(item)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.drawerItemText}>{item.label}</Text>
                    <Text style={styles.drawerItemArrow}>{'>'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.drawerLogoutButton}
                onPress={() => {
                  setMenuVisible(false);
                  handleLogout();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.drawerDismissArea}
              onPress={() => setMenuVisible(false)}
              activeOpacity={1}
              accessibilityLabel="Close menu"
            />
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#e2e8f0',
    marginBottom: 16,
    textAlign: 'left',
  },
  syncStatus: {
    color: '#bfdbfe',
    marginBottom: 12,
    textAlign: 'left',
    fontWeight: '600',
  },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  headerCopy: { flex: 1 },
  menuButton: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  menuGlyph: { width: 23, gap: 5 },
  menuGlyphLine: { height: 2.5, borderRadius: 2, backgroundColor: '#fff' },
  quickActionHeading: { width: '100%', marginBottom: 10 },
  quickActionTitle: { color: '#fff', fontSize: 21, fontWeight: '800' },
  quickActionSubtitle: { color: '#dbeafe', fontSize: 13, marginTop: 3 },
  quickActionGrid: { width: '100%', flexDirection: 'column', gap: 10 },
  quickActionButton: { width: '100%', minHeight: 76, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 15, justifyContent: 'center', gap: 4, elevation: 3 },
  quickActionButtonTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  quickActionButtonHint: { color: 'rgba(255,255,255,0.88)', fontSize: 12 },
  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(2,6,23,0.58)' },
  drawerPanel: { width: '84%', maxWidth: 350, height: '100%', backgroundColor: '#f8fafc', paddingTop: 48, paddingHorizontal: 20, paddingBottom: 20, elevation: 12 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  drawerEyebrow: { color: '#15803d', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  drawerTitle: { color: '#0f172a', fontSize: 24, fontWeight: '800', marginTop: 3 },
  drawerCloseButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  drawerCloseText: { color: '#334155', fontSize: 15, fontWeight: '800' },
  drawerItems: { paddingTop: 12, paddingBottom: 12, gap: 4 },
  drawerItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#fff' },
  drawerItemText: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
  drawerItemArrow: { color: '#94a3b8', fontSize: 19, fontWeight: '700' },
  drawerDismissArea: { flex: 1 },
  drawerLogoutButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#fee2e2', marginTop: 10 },
  drawerLogoutText: { color: '#b91c1c', fontWeight: '800', fontSize: 15 },
});
