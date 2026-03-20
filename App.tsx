/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { initDB, createUser, getUsers } from './src/database/db';
import { Text } from 'react-native';
import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

 useEffect(() => {
  initDB();

  createUser(
    "Aria",
    "Hariet",
    "aria@example.com",
    "123456",
    "owner"
  );

  getUsers(data => {
    console.log("Users:", data);
    setUsers(data);
  });

}, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);

  return (
    <View style={styles.container}>
  {users.map(user => (
    <View key={user.user_id} style={{ padding: 10 }}>
      <Text>{user.first_name} {user.last_name}</Text>
      <Text>{user.email}</Text>
    </View>
  ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

