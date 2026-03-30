import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initDB } from './src/database/db';

// IMPORT SCREENS
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FarmScreen from './src/screens/FarmScreen';
import ViewFarmsScreen from './src/screens/ViewFarmsScreen';

// CREATE STACK
const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        {/* LOGIN */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Login' }}
        />

        {/* REGISTER */}
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Register' }}
        />

        {/* DASHBOARD */}
        <Stack.Screen 
          name="Home" 
          component={DashboardScreen} 
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen 
        name="Farm" 
        component={FarmScreen} 
        />

        <Stack.Screen 
        name="ViewFarms" 
        component={ViewFarmsScreen} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}