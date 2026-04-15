import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ImageBackground, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { clearRememberedSession, getUserById } from '../database/db';
import { syncPendingBackup } from '../services/backupSync';
import { syncDeviceNotificationsForUser } from '../services/localNotifications';

export default function DashboardScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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

  const syncNotifications = useCallback(() => {
    if (!userId) {
      return;
    }

    syncDeviceNotificationsForUser(userId).catch(error => {
      console.log('Error syncing device notifications', error);
    });
  }, [userId]);

  const syncBackup = useCallback(() => {
    syncPendingBackup().catch(error => {
      console.log('Backup sync skipped:', error);
    });
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
    syncNotifications();
    syncBackup();
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const roleLabel = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : null;
  const isOwner = currentUser?.role === 'owner';

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

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('FarmManagement', { userId })}
          >
            <Text style={styles.cardText}>Farm Management</Text>
          </TouchableOpacity>

          {isOwner ? (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Register', { ownerUserId: userId })}
            >
              <Text style={styles.cardText}>Create Staff Account</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ViewFarms', { userId })}
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
            onPress={() => navigation.navigate('Notifications', { userId })}
          >
            <Text style={styles.cardText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
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
