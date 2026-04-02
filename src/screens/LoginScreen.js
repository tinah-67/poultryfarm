import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { clearRememberedSession, loginUser, saveRememberedSession } from '../database/db';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }

    loginUser(email, password, (user) => {
      if (user) {
        const finishLogin = () => {
          Alert.alert('Success', 'Login successful');
          navigation.replace('Home', { userId: user.user_id });
        };

        if (rememberMe) {
          saveRememberedSession(user.user_id, finishLogin);
        } else {
          clearRememberedSession(finishLogin);
        }
      } else {
        Alert.alert('Error', 'User not found');
      }
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text>Login</Text>

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

      <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe ? <View style={styles.checkboxIndicator} /> : null}
        </View>
        <Text style={styles.rememberText}>Remember Me</Text>
      </TouchableOpacity>

      <Button title="Login" onPress={handleLogin} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerLink}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
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
    color: '#222',
  },
  registerLink: {
    marginTop: 10,
    color: 'blue',
  },
});
