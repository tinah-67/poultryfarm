import React, { useCallback, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ImageBackground, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { clearRememberedSession, getUserById } from '../database/db';
import { syncPendingBackup } from '../services/backupSync';
import { syncDeviceNotificationsForUser } from '../services/localNotifications';

// Shows the main menu after login and starts background sync work.
export default function DashboardScreen({ navigation, route, showBottomTabs = false }) {
  // Tracks the signed-in user, refresh state, and backup-sync guard.
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [syncingBackup, setSyncingBackup] = useState(false);
  const syncingBackupRef = useRef(false);

  console.log('DASHBOARD userId:', userId);

  // Loads the current user so role-specific dashboard options can be shown.
  const loadUser = useCallback(() => {
    if (!userId) {
      setCurrentUser(null);
      return;
    }

    getUserById(userId, user => {
      setCurrentUser(user);
    });
  }, [userId]);

  // Generates and stores reminder notifications for the signed-in user.
  const syncNotifications = useCallback((options = {}) => {
    if (!userId) {
      return;
    }

    syncDeviceNotificationsForUser(userId, options).catch(error => {
      console.log('Error syncing device notifications', error);
    });
  }, [userId]);

  // Uploads pending local records while preventing overlapping sync runs.
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
        Alert.alert('Sync complete', `${syncedCount} record(s) synced to backup.`);
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

  // Refreshes user, reminders, and backup sync whenever the dashboard receives focus.
  useFocusEffect(
    useCallback(() => {
      loadUser();
      syncNotifications();
      syncBackup();
    }, [loadUser, syncNotifications, syncBackup])
  );

  // Logs out by clearing the remembered session and returning to login.
  const handleLogout = () => {
    clearRememberedSession(() => {
      navigation.replace('Login');
    });
  };

  // Pull-to-refresh reloads user data, forces reminders, and retries backup sync.
  const handleRefresh = () => {
    setRefreshing(true);
    loadUser();
    syncNotifications({ force: true });
    Promise.resolve(syncBackup()).finally(() => {
      setRefreshing(false);
    });
  };

  const roleLabel = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : null;
  const isOwner = currentUser?.role === 'owner';
  const canAccessFarmManagement = ['owner', 'manager'].includes(currentUser?.role);

  // Renders role-aware navigation cards for the main app workflows.
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
          <Text style={styles.title}>BroilerHub Dashboard</Text>
          {roleLabel ? <Text style={styles.subtitle}>Signed in as {roleLabel}</Text> : null}
          {syncingBackup ? <Text style={styles.syncStatus}>Syncing backup...</Text> : null}

          {/* Owner and manager users can access farm-level workflows. */}
          {canAccessFarmManagement ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('FarmManagement', { userId })}
            >
              <Text style={styles.cardText}>Farm Management</Text>
            </TouchableOpacity>
          ) : null}

          {/* Only owners can create staff accounts. */}
          {isOwner ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Register', { ownerUserId: userId })}
            >
              <Text style={styles.cardText}>Create Staff Account</Text>
            </TouchableOpacity>
          ) : null}

          {/* Core app workflows available from the dashboard. */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ViewFarms', { userId, selectionMode: 'batch' })}
          >
            <Text style={styles.cardText}>Batch Management</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Reports', { userId })}
          >
            <Text style={styles.cardText}>Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Search', { userId })}
          >
            <Text style={styles.cardText}>Search / Queries</Text>
          </TouchableOpacity>

          {!showBottomTabs ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Notifications', { userId })}
            >
              <Text style={styles.cardText}>Reminders</Text>
            </TouchableOpacity>
          ) : null}

          {/* Recovery question setup is available once the user record has loaded. */}
          {currentUser ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('RecoveryQuestion', { userId })}
            >
              <Text style={styles.cardText}>
                {String(currentUser.recovery_question || '').trim()
                  ? 'Update Recovery Question'
                  : 'Set Recovery Question'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Standalone dashboard mode shows Help; tabbed mode uses the bottom Help tab. */}
          {!showBottomTabs ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Help', { userId })}
            >
              <Text style={styles.cardText}>Help</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Background, overlay, and dashboard layout styles.
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
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#e2e8f0',
    marginBottom: 16,
    textAlign: 'center',
  },
  syncStatus: {
    color: '#bfdbfe',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Main dashboard action card styles.
  card: {
    width: '100%',
    padding: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    marginVertical: 8,
    borderRadius: 10,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  // Logout button styles.
  logoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(198, 40, 40, 0.82)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
