import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { createFarm } from '../database/db';

export default function FarmScreen({ navigation }) {
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');

  const handleAddFarm = () => {
    if (!farmName || !location) {
      alert("Enter all fields");
      return;
    }

    createFarm(1, farmName, location);

    alert("Farm added successfully ✅");

    setFarmName('');
    setLocation('');

    // 👇 NAVIGATE TO VIEW FARMS
    navigation.navigate('ViewFarms');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏡 Add Farm</Text>

      <TextInput
        placeholder="Farm Name"
        value={farmName}
        onChangeText={setFarmName}
        style={styles.input}
      />

      <TextInput
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />

      <Button title="Save Farm" onPress={handleAddFarm} />

      {/* 👇 Optional button */}
      <Button
        title="View Farms"
        onPress={() => navigation.navigate('ViewFarms')}
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