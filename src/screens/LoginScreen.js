import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { clearRememberedSession, loginUser, saveRememberedSession } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { bootstrapDeviceLogin } from '../services/bootstrapLogin';

// Handles account login, remembered sessions, and backup restore for missing local users.
export default function LoginScreen({ navigation }) {
  // Stores form fields and lightweight UI state for the login form.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Validates credentials, tries local login, and falls back to backup bootstrap.
  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Completes a successful login after role and recovery-question checks.
    const finishLogin = user => {
      if (user.role !== 'owner' && !user.owner_user_id) {
        Alert.alert('Access denied', 'This staff account is not linked to an owner yet.');
        return;
      }

      const hasRecoveryQuestion = Boolean(String(user.recovery_question || '').trim());

      if (!hasRecoveryQuestion) {
        clearRememberedSession(() => {
          navigation.replace('RecoveryQuestion', {
            userId: user.user_id,
            requiredOnLogin: true,
          });
        });
        return;
      }

      const complete = () => {
        Alert.alert('Success', 'Login successful');
        navigation.replace('Home', { userId: user.user_id });
      };

      if (rememberMe) {
        saveRememberedSession(user.user_id, complete);
      } else {
        clearRememberedSession(complete);
      }
    };

    loginUser(normalizedEmail, password, async ({ status, user }) => {
      if (status === 'wrong_password') {
        Alert.alert('Error', 'The password is incorrect for this account. Check the password and try again.');
        return;
      }

      if (status === 'error') {
        Alert.alert('Error', 'Login could not be completed right now. Please try again.');
        return;
      }

      if (status === 'not_found') {
        try {
          const bootstrappedUser = await bootstrapDeviceLogin(normalizedEmail, password);
          finishLogin(bootstrappedUser);
        } catch (error) {
          console.log('Bootstrap login failed', error);
          const message = String(error?.message || '');

          if (message.toLowerCase().includes('user not found')) {
            Alert.alert(
              'Account not in backup',
              'This device is online, but this account was not found in the backup server. It may not have been backed up before the app was uninstalled.'
            );
            return;
          }

          if (message.toLowerCase().includes('invalid password')) {
            Alert.alert('Error', 'The password is incorrect for the backup account.');
            return;
          }

          Alert.alert(
            'Error',
            'User not found on this device, and the backup restore could not complete. Please try again shortly.'
          );
        }
        return;
      }

      if (!user) {
        Alert.alert('Error', 'Login could not be completed right now. Please try again.');
        return;
      }

      finishLogin(user);
    });
  };

  // Provides a small pull-to-refresh affordance on the login screen.
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Login</Text>

      {/* Collects the account email and password. */}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />

      <View style={styles.passwordField}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          key={showPassword ? 'visible' : 'hidden'}
          style={styles.passwordInput}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
          style={styles.passwordToggle}
        >
          <Text style={styles.passwordToggleText}>{showPassword ? '\u{1F648}' : '\u{1F441}'}</Text>
        </TouchableOpacity>
      </View>

      {/* Lets the user keep a short-lived remembered session. */}
      <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe ? <View style={styles.checkboxIndicator} /> : null}
        </View>
        <Text style={styles.rememberText}>Remember Me</Text>
      </TouchableOpacity>

      <Button title="Login" onPress={handleLogin} />

      {/* Provides navigation to recovery, login help, and owner registration. */}
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPasswordLink}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Help', { mode: 'login' })}>
        <Text style={styles.helpLink}>
          Need help signing in?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>
          Need an owner account? Register
        </Text>
      </TouchableOpacity>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Login form layout and input styles.
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  passwordField: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    paddingRight: 56,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleText: {
    fontSize: 18,
  },
  // Remember-me checkbox styles.
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkboxIndicator: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  rememberText: {
    color: '#fff',
  },
  // Secondary action link styles.
  registerLink: {
    marginTop: 10,
    color: '#bfdbfe',
    textAlign: 'center',
  },
  forgotPasswordLink: {
    marginTop: 14,
    color: '#fde68a',
    textAlign: 'center',
    fontWeight: '600',
  },
  helpLink: {
    marginTop: 10,
    color: '#d1fae5',
    textAlign: 'center',
    fontWeight: '600',
  },
});
