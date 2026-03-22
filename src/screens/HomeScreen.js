import React from 'react';
import { View, Text, Button } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={{ padding: 20 }}>
      <Text>Welcome to Poultry App 🐔</Text>

      <Button title="Logout" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}