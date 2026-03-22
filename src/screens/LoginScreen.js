import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { loginUser } from '../database/db';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }

    loginUser(email, password, (user) => {
      if (user) {
        Alert.alert('Success', `Welcome ${user.first_name}`);
        navigation.navigate('Home');
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Login</Text>

      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <Button title="Login" onPress={handleLogin} />

      <Text onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }}>
        Don't have an account? Register
      </Text>
    </View>
  );
}