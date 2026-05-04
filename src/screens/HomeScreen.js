import React from 'react';
import { Text, Button, StyleSheet } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';

// Legacy simple home screen kept for navigation compatibility.
export default function HomeScreen({ navigation }) {
  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome to Poultry App</Text>
      <Button title="Logout" onPress={() => navigation.navigate('Login')} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Centers the welcome message and logout button.
  container: {
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
});
