import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { clearRememberedSession, getRememberedSession, initDB } from './src/database/db';
import { syncPendingBackup } from './src/services/backupSync';
import { consumePendingNotificationOpen } from './src/services/localNotifications';

// Imports every screen registered in the navigation stack.
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
import SearchScreen from './src/screens/SearchScreen';
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

// Creates the root stack navigator and a navigation ref for notification opens.
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

// Describes route params that may carry the signed-in user id.
type RouteParamsWithUserId = {
  userId?: number | string;
};

// Initializes the app database, session restore, sync, notifications, and navigation.
export default function App() {
  // Tracks initial app readiness and the current user for notification routing.
  const [isReady, setIsReady] = useState(false);
  const [initialUserId, setInitialUserId] = useState<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const currentUserIdRef = useRef<number | null>(null);

  // Keeps the notification routing ref aligned with the restored session.
  useEffect(() => {
    currentUserIdRef.current = initialUserId;
  }, [initialUserId]);

  // Opens the reminders tab when the app was launched from a notification.
  const openNotificationsFromIntent = useCallback(async () => {
    if (!isReady || !navigationRef.isReady()) {
      return;
    }

    const notificationOpen = await consumePendingNotificationOpen();

    if (!notificationOpen?.shouldOpenNotifications) {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute();
    const currentRouteParams = currentRoute?.params as RouteParamsWithUserId | undefined;
    const notificationUserId = Number(notificationOpen.userId);
    const routeUserId = Number(currentRouteParams?.userId);
    const targetUserId =
      Number.isFinite(notificationUserId) && notificationUserId > 0
        ? notificationUserId
        : Number.isFinite(routeUserId) && routeUserId > 0
          ? routeUserId
          : currentUserIdRef.current;

    if (!targetUserId) {
      return;
    }

    currentUserIdRef.current = targetUserId;
    navigationRef.navigate('Home', { userId: targetUserId, activeTab: 'notifications' });
  }, [isReady]);

  // Boots the local database, attempts backup sync, and restores the remembered session.
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

  // Handles any pending notification intent after navigation becomes ready.
  useEffect(() => {
    if (!isReady) {
      return;
    }

    openNotificationsFromIntent();
  }, [isReady, openNotificationsFromIntent]);

  // Watches app foreground/background changes for notification opens and session clearing.
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

  // Shows a simple loading state while the database and session restore finish.
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Registers every app screen and preserves the current user id as navigation changes.
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={openNotificationsFromIntent}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute();
        const routeParams = route?.params as RouteParamsWithUserId | undefined;
        const routeUserId = Number(routeParams?.userId);

        if (Number.isFinite(routeUserId) && routeUserId > 0) {
          currentUserIdRef.current = routeUserId;
        }
      }}
    >
      <Stack.Navigator initialRouteName={initialUserId ? 'Home' : 'Login'}>

        {/* Authentication screens. */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Login' }}
        />

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

        {/* Main dashboard and shared app sections. */}
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
          options={{ title: 'Reminders' }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Reports' }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ title: 'Search / Queries' }}
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

        {/* Batch operations and batch-level records. */}
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
  // Centers the startup spinner while initialization is running.
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
