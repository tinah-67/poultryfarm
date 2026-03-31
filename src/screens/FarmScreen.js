import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { createFarm, getUserById } from '../database/db';

export default function FarmScreen({ navigation, route }) {
  // `userId` may come as `userId` or `user_Id` depending on navigation source
  const userId = route?.params?.userId ?? route?.params?.user_Id;

  console.log("FarmScreen userId:", userId);

  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');

  const handleAddFarm = () => {
    if (!userId) {
      alert("User not found: " + userId);
      return;
    }

    if (!farmName || !location) {
      alert("Enter all fields");
      return;
    }

    getUserById(userId, (user) => {
      if (!user) {
        alert("User not found in DB: " + userId);
        return;
      }

      if (user.role !== 'owner') {
        alert('Only owner users can add farms');
        return;
      }

      createFarm(userId, farmName, location, () => {
        alert("Farm added successfully");

        setFarmName('');
        setLocation('');

        // 👇 PASS userId AGAIN WHEN NAVIGATING
        navigation.navigate('ViewFarms', { userId });
      });
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Farm</Text>

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

      <Button title="Save Farm" onPress={handleAddFarm} />

      <Button
        title="View Farms"
        onPress={() => navigation.navigate('ViewFarms', { userId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 8,
    borderRadius: 5,
  },
});