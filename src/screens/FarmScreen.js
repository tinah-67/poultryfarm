import React, { useMemo, useState } from 'react';
import { Text, TextInput, Button, StyleSheet, Alert, RefreshControl } from 'react-native';
import { createFarm, farmExistsForUser, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

// Lets owner users create a new farm record.
export default function FarmScreen({ navigation, route }) {
  // Tracks the farm form and save/refresh state.
  const userId = route?.params?.userId ?? route?.params?.user_Id;

  console.log('FarmScreen userId:', userId);

  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Prepares trimmed values and checks whether the form can be submitted.
  const trimmedFarmName = farmName.trim();
  const trimmedLocation = location.trim();
  const isFormValid = useMemo(
    () => Boolean(trimmedFarmName && trimmedLocation),
    [trimmedFarmName, trimmedLocation]
  );

  // Validates owner permission, prevents duplicates, and saves the farm.
  const handleAddFarm = () => {
    if (isSaving) {
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (!isFormValid) {
      Alert.alert('Error', 'Enter all fields');
      return;
    }

    getUserById(userId, user => {
      if (!user) {
        Alert.alert('Error', 'User not found in database');
        return;
      }

      if (user.role !== 'owner') {
        Alert.alert('Error', 'Only owner users can add farms');
        return;
      }

      farmExistsForUser(userId, trimmedFarmName, trimmedLocation, exists => {
        if (exists) {
          Alert.alert('Duplicate farm', 'This farm has already been registered for this owner.');
          return;
        }

        setIsSaving(true);

        createFarm(userId, trimmedFarmName, trimmedLocation, () => {
          setIsSaving(false);
          Alert.alert('Success', 'Farm added successfully');

          setFarmName('');
          setLocation('');

          navigation.navigate('ViewFarms', { userId });
        });
      });
    });
  };

  // Clears the form during pull-to-refresh.
  const handleRefresh = () => {
    setRefreshing(true);
    setFarmName('');
    setLocation('');
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Add Farm</Text>

      {/* Collects the farm name and physical location. */}
      <TextInput
        placeholder="Farm Name"
        placeholderTextColor="#666"
        value={farmName}
        onChangeText={setFarmName}
        style={styles.input}
      />

      <TextInput
        placeholder="Location"
        placeholderTextColor="#666"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      <Button
        title={isSaving ? 'Saving...' : 'Save Farm'}
        onPress={handleAddFarm}
        disabled={!isFormValid || isSaving}
      />

      <Button
        title="View Farms"
        onPress={() => navigation.navigate('ViewFarms', { userId })}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Farm form layout and input styles.
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#fff' },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
});
