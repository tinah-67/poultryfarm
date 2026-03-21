/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { initDB, createUser, getUsers, loginUser} from './src/database/db';

function AppContent() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner'); // 
  const [users, setUsers] = useState([]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    initDB();
    loadUsers();
  }, []);

  const loadUsers = () => {
    getUsers(data => {
      setUsers(data);
    });
  };

  const handleRegister = () => {
    if (!firstName || !email || !password) {
      alert("Please fill all required fields");
      return;
    }

    createUser(firstName, lastName, email, password, role); 
    loadUsers();

    // Clear inputs
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('owner'); // reset role
  };

  const handleLogin = () => {
    if (!loginEmail || !loginPassword) {
      return;
    }

    loginUser(loginEmail, loginPassword, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        console.log("Invalid credentials");
      }
    });
  };

  if (currentUser) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Welcome {currentUser.first_name}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Create Account</Text>

      {/* ROLE SELECTION */}
      <Text style={styles.subtitle}>Select Role</Text>

      <View style={styles.roleContainer}>
        <Button title="Owner" onPress={() => setRole('owner')} />
        <Button title="Manager" onPress={() => setRole('manager')} />
        <Button title="Worker" onPress={() => setRole('worker')} />
      </View>

      <Text style={styles.selectedRole}>Selected Role: {role}</Text>

      {/* INPUTS */}
      <TextInput
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
      />

      <TextInput
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Button title="Create Account" onPress={handleRegister} />

      <Text style={styles.title}>Login</Text>

          <TextInput
            placeholder="Email"
            value={loginEmail}
            onChangeText={setLoginEmail}
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
            style={styles.input}
          />

          <Button title="Login" onPress={handleLogin} />

      {/* USERS LIST */}
      <Text style={styles.title}>Users</Text>

      {users.map(user => (
        <View key={user.user_id} style={{ marginTop: 10 }}>
          <Text>{user.first_name} {user.last_name}</Text>
          <Text>{user.email}</Text>
          <Text>Role: {user.role}</Text> {/* SHOW ROLE */}
        </View>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  selectedRole: {
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default AppContent;