import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { clearRememberedSession, getRememberedSession, initDB } from './src/database/db';
import { syncPendingBackup } from './src/services/backupSync';
import { consumePendingNotificationOpen } from './src/services/localNotifications';

// IMPORT SCREENS
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeShellScreen from './src/screens/HomeShellScreen';
import FarmManagementScreen from './src/screens/FarmManagementScreen';
import FarmScreen from './src/screens/FarmScreen';
import ViewFarmsScreen from './src/screens/ViewFarmsScreen';
import FarmPerformanceSummaryScreen from './src/screens/FarmPerformanceSummaryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import HelpScreen from './src/screens/HelpScreen';
import RecoveryQuestionScreen from './src/screens/RecoveryQuestionScreen';
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
const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialUserId, setInitialUserId] = useState<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const currentUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    currentUserIdRef.current = initialUserId;
  }, [initialUserId]);

  const openNotificationsFromIntent = useCallback(async () => {
    if (!isReady || !navigationRef.isReady()) {
      return;
    }

    const shouldOpenNotifications = await consumePendingNotificationOpen();

    if (!shouldOpenNotifications) {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute();
    const routeUserId = Number(currentRoute?.params?.userId);
    const targetUserId = Number.isFinite(routeUserId) && routeUserId > 0
      ? routeUserId
      : currentUserIdRef.current;

    if (!targetUserId) {
      return;
    }

    navigationRef.navigate('Home', { userId: targetUserId, activeTab: 'notifications' });
  }, [isReady]);

  useEffect(() => {
    initDB();
    syncPendingBackup().catch(error => {
      console.log('Initial backup sync skipped:', error);
    });

    getRememberedSession((session: { user_id: number } | null) => {
      setInitialUserId(session?.user_id ?? null);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    openNotificationsFromIntent();
  }, [isReady, openNotificationsFromIntent]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'active') {
        openNotificationsFromIntent();
      }

      if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
        clearRememberedSession(() => {
          console.log('Remembered session cleared after app exit/background');
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [openNotificationsFromIntent]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={openNotificationsFromIntent}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute();
        const routeUserId = Number(route?.params?.userId);

        if (Number.isFinite(routeUserId) && routeUserId > 0) {
          currentUserIdRef.current = routeUserId;
        }
      }}
    >
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
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'Forgot Password' }}
        />

        {/* DASHBOARD */}
        <Stack.Screen
          name="Home"
          component={HomeShellScreen}
          initialParams={initialUserId ? { userId: initialUserId } : undefined}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FarmManagement"
          component={FarmManagementScreen}
          options={{ title: 'Farm Management' }}
        />
        <Stack.Screen
          name="AddFarm"
          component={FarmScreen}
          options={{ title: 'Add Farm' }}
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
        <Stack.Screen
          name="Help"
          component={HelpScreen}
          options={{ title: 'Help' }}
        />
        <Stack.Screen
          name="RecoveryQuestion"
          component={RecoveryQuestionScreen}
          options={{ title: 'Recovery Question' }}
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
