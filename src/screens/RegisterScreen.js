import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { createUser } from '../database/db';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('owner');
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  const validateForm = () => {
    setErrorMessage('');
    const nameRegex = /^[A-Za-z]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill all required fields');
      return false;
    }

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      setErrorMessage('First name and last name can only contain letters');
      return false;
    }

    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return false;
    }

    if (!/[A-Za-z]/.test(password)) {
      setErrorMessage('Password must contain at least one letter');
      return false;
    }

    if (!/\d/.test(password)) {
      setErrorMessage('Password must contain at least one number');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return false;
    }

    return true;
  };

  useEffect(() => {
    setIsFormValid(validateForm());
  }, [firstName, lastName, email, password, confirmPassword]);

  const handleRegister = async () => {
    console.log('handleRegister pressed', { firstName, lastName, email, password, confirmPassword, role });

    const nameRegex = /^[A-Za-z]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      const msg = 'Please fill all required fields';
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      const msg = 'First name and last name can only contain letters';
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (!emailRegex.test(email)) {
      const msg = 'Please enter a valid email address';
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters';
      console.log('validation fail:', msg, { password });
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (!/[A-Za-z]/.test(password)) {
      const msg = 'Password must contain at least one letter';
      console.log('validation fail:', msg, { password });
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (!/\d/.test(password)) {
      const msg = 'Password must contain at least one number';
      console.log('validation fail:', msg, { password });
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      console.log('validation fail:', msg, { password, confirmPassword });
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    setErrorMessage('');

    try {
      // 1. Save locally FIRST
      await createUser(firstName, lastName, email, password, role);
      
      // 2. Send to backend
      const response = await fetch('http://192.168.100.26:3000/users', {
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

      {errorMessage ? <Text style={{ color: 'red', marginBottom: 12 }}>{errorMessage}</Text> : null}

      <Text>Select Role: {role}</Text>

      <Button title="Owner" onPress={() => setRole('owner')} />
      <Button title="Manager" onPress={() => setRole('manager')} />
      <Button title="Worker" onPress={() => setRole('worker')} />

      <TextInput 
        placeholder="First Name" 
        placeholderTextColor="#999"
        value={firstName} 
        onChangeText={setFirstName}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 }}
      />
      <TextInput 
        placeholder="Last Name" 
        placeholderTextColor="#999"
        value={lastName} 
        onChangeText={setLastName}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 }}
      />
      <TextInput 
        placeholder="Email" 
        placeholderTextColor="#999"
        value={email} 
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 }}
      />
      <View style={{ position: 'relative', marginBottom: 12 }}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, paddingRight: 44, borderRadius: 6 }}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -12 }], width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ position: 'relative', marginBottom: 12 }}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, paddingRight: 44, borderRadius: 6 }}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -12 }], width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 18 }}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <Button title="Create Account" onPress={handleRegister} disabled={!isFormValid} />

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={{ marginTop: 10, color: 'blue', textAlign: 'center' }}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}