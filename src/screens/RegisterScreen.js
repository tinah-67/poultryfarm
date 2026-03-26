import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { createUser } from '../database/db';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner');

  const handleRegister = async () => {
  if (!firstName || !email || !password) {
    Alert.alert('Error', 'Please fill all required fields');
    return;
  }

  // 1. Save locally FIRST
  createUser(firstName, lastName, email, password, role);

  try {
    // 2. Send to backend
    const response = await fetch('http://10.0.2.2:3000/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      }),
    });

    const data = await response.json();
    console.log(data);

    Alert.alert('Success', 'Saved locally & synced to cloud');

  } catch (error) {
    console.log(error);
    Alert.alert('Saved locally (offline mode)');
  }

  navigation.navigate('Login');
};
  return (
    <View style={{ padding: 20 }}>
      <Text>Create Account</Text>

      <Text>Select Role: {role}</Text>

      <Button title="Owner" onPress={() => setRole('owner')} />
      <Button title="Manager" onPress={() => setRole('manager')} />
      <Button title="Worker" onPress={() => setRole('worker')} />

      <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} />
      <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <Button title="Create Account" onPress={handleRegister} />

      <Text onPress={() => navigation.navigate('Login')} style={{ marginTop: 10 }}>
        Already have an account? Login
      </Text>
    </View>
  );
}