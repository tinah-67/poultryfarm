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
import FarmPerformanceSummaryScreen from './src/screens/FarmPerformanceSummaryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import CreateBatchScreen from './src/screens/CreateBatchScreen';
import ViewBatchesScreen from './src/screens/ViewBatchesScreen';
import BatchDetailsScreen from './src/screens/BatchDetailsScreen';
import BatchPerformanceScreen from './src/screens/BatchPerformanceScreen';
import FeedScreen from './src/screens/FeedScreen';
import ViewFeedsScreen from './src/screens/ViewFeedsScreen';
import MortalityScreen from './src/screens/MortalityScreen';
import ViewMortalityScreen from './src/screens/ViewMortalityScreen';
import VaccinationScreen from './src/screens/VaccinationScreen';
import ViewVaccinationsScreen from './src/screens/ViewVaccinationsScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import ViewExpensesScreen from './src/screens/ViewExpensesScreen';
import SalesScreen from './src/screens/SalesScreen';
import ViewSalesScreen from './src/screens/ViewSalesScreen';

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
        <Stack.Screen
          name="FarmPerformanceSummary"
          component={FarmPerformanceSummaryScreen}
          options={{ title: 'Farm Performance' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications' }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Reports' }}
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
          name="BatchPerformance"
          component={BatchPerformanceScreen}
          options={{ title: 'Batch Performance' }}
        />
        <Stack.Screen
          name="Feed"
          component={FeedScreen}
          options={{ title: 'Record Feed' }}
        />
        <Stack.Screen
          name="ViewFeeds"
          component={ViewFeedsScreen}
          options={{ title: 'Feed Records' }}
        />
        <Stack.Screen
          name="Mortality"
          component={MortalityScreen}
          options={{ title: 'Record Mortality' }}
        />
        <Stack.Screen
          name="ViewMortality"
          component={ViewMortalityScreen}
          options={{ title: 'Mortality Records' }}
        />
        <Stack.Screen
          name="Vaccination"
          component={VaccinationScreen}
          options={{ title: 'Record Vaccination' }}
        />
        <Stack.Screen
          name="ViewVaccinations"
          component={ViewVaccinationsScreen}
          options={{ title: 'Vaccination Records' }}
        />
        <Stack.Screen
          name="Expense"
          component={ExpenseScreen}
          options={{ title: 'Record Expense' }}
        />
        <Stack.Screen
          name="ViewExpenses"
          component={ViewExpensesScreen}
          options={{ title: 'Expense Records' }}
        />
        <Stack.Screen
          name="Sales"
          component={SalesScreen}
          options={{ title: 'Record Sales' }}
        />
        <Stack.Screen
          name="ViewSales"
          component={ViewSalesScreen}
          options={{ title: 'Sales Records' }}
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
