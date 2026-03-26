import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }

    try {
      const response = await fetch('http://10.0.2.2:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const text = await response.text();
      console.log("SERVER RESPONSE:", text);

      if (!response.ok) {
        Alert.alert('Error', text);
        return;
      }

      const data = JSON.parse(text);

      Alert.alert('Success', 'Login successful');

      // 👉 You can later store this if rememberMe is true
      if (rememberMe) {
        console.log("User chose to be remembered");
      }

      navigation.navigate('Home');

    } catch (error) {
      console.log("LOGIN ERROR:", error);
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />

      {/* 👁 Show Password */}
      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
        <Text style={{ color: 'blue', marginBottom: 10 }}>
          {showPassword ? 'Hide Password' : 'Show Password'}
        </Text>
      </TouchableOpacity>

      {/* ✅ Remember Me */}
      <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
        <Text style={{ marginBottom: 10 }}>
          {rememberMe ? '☑ Remember Me' : '☐ Remember Me'}
        </Text>
      </TouchableOpacity>

      <Button title="Login" onPress={handleLogin} />

      <Text onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }}>
        Don't have an account? Register
      </Text>
    </View>
  );
}