import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { getRememberedSession, initDB } from './src/database/db';

// IMPORT SCREENS
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FarmScreen from './src/screens/FarmScreen';
import ViewFarmsScreen from './src/screens/ViewFarmsScreen';
import CreateBatchScreen from './src/screens/CreateBatchScreen';
import ViewBatchesScreen from './src/screens/ViewBatchesScreen';
import BatchDetailsScreen from './src/screens/BatchDetailsScreen';
import FeedScreen from './src/screens/FeedScreen';
import MortalityScreen from './src/screens/MortalityScreen';
import VaccinationScreen from './src/screens/VaccinationScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import SalesScreen from './src/screens/SalesScreen';

// CREATE STACK
const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialUserId, setInitialUserId] = useState<number | null>(null);

  useEffect(() => {
    initDB();

    getRememberedSession((session: { user_id: number } | null) => {
      setInitialUserId(session?.user_id ?? null);
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialUserId ? 'Home' : 'Login'}>

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
          initialParams={initialUserId ? { userId: initialUserId } : undefined}
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen 
        name="Farm" 
        component={FarmScreen}
        />

        <Stack.Screen 
        name="ViewFarms" 
        component={ViewFarmsScreen}
        options={{ title: 'View Farms' }} 
        />

        <Stack.Screen name="CreateBatch" 
        component={CreateBatchScreen} 
        options={{ title: 'Record Batch' }}
        />
        <Stack.Screen name="ViewBatches" 
        component={ViewBatchesScreen} 
        options={{ title: 'View Batches' }}
        />
        <Stack.Screen name="BatchDetails" 
        component={BatchDetailsScreen} 
        options={{ title: 'Batch Details' }}
        />
        <Stack.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{ title: 'Feeds' }} 
        />
        <Stack.Screen
        name="Mortality"
        component={MortalityScreen}
        options={{ title: 'Mortality' }}
        />
        <Stack.Screen
        name="Vaccination"
        component={VaccinationScreen}
        options={{ title: 'Vaccination' }}
        />
        <Stack.Screen
        name="Expense"
        component={ExpenseScreen}
        options={{ title: 'Expenses' }}
        />
        <Stack.Screen
        name="Sales"
        component={SalesScreen}
        options={{ title: 'Sales' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
