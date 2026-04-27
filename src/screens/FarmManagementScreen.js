import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function FarmManagementScreen({ navigation, route }) {
  const userId = route?.params?.userId ?? route?.params?.user_Id;
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!userId) {
      setCurrentUser(null);
      return;
    }

    getUserById(userId, user => {
      setCurrentUser(user);
    });
  }, [userId]);

  const canAddFarm = currentUser?.role === 'owner';

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Farm Management</Text>
      <Text style={styles.helperText}>
        Choose what you want to manage at farm level.
      </Text>

      {canAddFarm ? (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddFarm', { userId })}
        >
          <Text style={styles.cardText}>Add Farm</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ViewFarms', { userId })}
      >
        <Text style={styles.cardText}>View Farms</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ViewFarms', { userId, selectionMode: 'expense' })}
      >
        <Text style={styles.cardText}>Record Farm Expense</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('FarmPerformanceSummary', { userId })}
      >
        <Text style={styles.cardText}>Farm Performance</Text>
      </TouchableOpacity>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  helperText: {
    color: '#e2e8f0',
    marginBottom: 18,
  },
  card: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
