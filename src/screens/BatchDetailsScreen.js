import React, { useEffect, useState } from 'react';
import { Text, Button, StyleSheet } from 'react-native';
import { getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

export default function BatchDetailsScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const farmName = route?.params?.farmName;
  const userId = route?.params?.userId;
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

  const role = currentUser?.role;
  const feedLabel = role === 'worker' ? 'Record Feed' : 'View Feed Records';
  const mortalityLabel = role === 'worker' ? 'Record Mortality' : 'View Mortality Records';
  const vaccinationLabel = role === 'worker' ? 'Record Vaccination' : 'View Vaccination Records';
  const expenseLabel = role === 'manager' ? 'Record Expense' : 'View Expense Records';
  const salesLabel = role === 'manager' ? 'Record Sales' : 'View Sales Records';

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Batch Details</Text>
      <Text style={styles.meta}>Batch ID: {batchId}</Text>
      {farmName ? <Text style={styles.meta}>Farm: {farmName}</Text> : null}
      <Text style={styles.meta}>
        {role
          ? `Signed in as ${role.charAt(0).toUpperCase()}${role.slice(1)}`
          : 'Loading role permissions...'}
      </Text>

      <Button title={feedLabel} onPress={() => navigation.navigate('Feed', { batchId, userId })} />
      <Button title={mortalityLabel} onPress={() => navigation.navigate('Mortality', { batchId, userId })} />
      <Button title={vaccinationLabel} onPress={() => navigation.navigate('Vaccination', { batchId, userId })} />
      <Button title={expenseLabel} onPress={() => navigation.navigate('Expense', { batchId, userId })} />
      <Button title={salesLabel} onPress={() => navigation.navigate('Sales', { batchId, userId })} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    color: '#fff',
    fontWeight: '700',
  },
  meta: {
    color: '#fff',
  },
});
