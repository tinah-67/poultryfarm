import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { createFarm } from '../database/db';

export default function FarmScreen({ navigation, route }) {
  // 👇 RECEIVE USER ID FROM PREVIOUS SCREEN
  const user_Id = route?.params?.user_Id;

  console.log("FarmScreen userId:", user_Id);

  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');

  const handleAddFarm = () => {
    if (!user_Id) {
      alert("User not found: " + user_Id);
      return null;
    }
    
    if (!farmName || !location) {
      alert("Enter all fields");
      return;
    }

    // 👇 PASS owner_id PROPERLY
    createFarm(user.user_Id, farmName, location, () => {
      alert("Farm added successfully");

      setFarmName('');
      setLocation('');

      // 👇 PASS userId AGAIN WHEN NAVIGATING
      navigation.navigate('ViewFarms', { userId: user_Id });
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Farm</Text>

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

      <Button
        title="View Farms"
        onPress={() => navigation.navigate('ViewFarms', { userId: user_Id })}
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