import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { loginUser } from '../database/db';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }

    loginUser(email, password, (user) => {
      if (user) {
        Alert.alert('Success', 'Login successful');
        navigation.replace('Home', { userId: user.user_id });
      } else {
        Alert.alert('Error', 'User not found');
      }
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Login</Text>

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
          key={showPassword ? 'visible' : 'hidden'}
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 12, paddingRight: 56, borderRadius: 6 }}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
          style={{ position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -15 }], width: 40, height: 30, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 18 }}>{showPassword ? '\u{1F648}' : '\u{1F441}'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
        <Text style={{ marginBottom: 10 }}>
          {rememberMe ? '[x] Remember Me' : '[ ] Remember Me'}
        </Text>
      </TouchableOpacity>

      <Button title="Login" onPress={handleLogin} />

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={{ marginTop: 10, color: 'blue' }}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}
