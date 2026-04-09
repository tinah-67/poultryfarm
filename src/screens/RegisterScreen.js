import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { createUser, getUserByEmail, markUserAsSynced } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

const getValidationMessage = ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
}, forSubmit = false) => {
  const nameRegex = /^[A-Za-z]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();

  if (forSubmit && (!firstName || !lastName || !normalizedEmail || !password || !confirmPassword)) {
    return 'Please fill all required fields';
  }

  if (firstName && !nameRegex.test(firstName)) {
    return 'First name can only contain letters';
  }

  if (lastName && !nameRegex.test(lastName)) {
    return 'Last name can only contain letters';
  }

  if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
    return 'Please enter a valid email address';
  }

  if (password && password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (password && !/[A-Za-z]/.test(password)) {
    return 'Password must contain at least one letter';
  }

  if (password && !/\d/.test(password)) {
    return 'Password must contain at least one number';
  }

  if (confirmPassword && password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return '';
};

export default function RegisterScreen({ navigation, route }) {
  const ownerUserId = route?.params?.ownerUserId ?? null;
  const isOwnerCreatingStaff = ownerUserId != null;
  const roleOptions = [
    { label: 'Manager', value: 'manager' },
    { label: 'Worker', value: 'worker' },
  ];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState(isOwnerCreatingStaff ? 'manager' : 'owner');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasStartedTyping = Boolean(firstName || lastName || email || password || confirmPassword);

  useEffect(() => {
    if (!hasStartedTyping) {
      setErrorMessage('');
      return;
    }

    setErrorMessage(
      getValidationMessage({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      })
    );
  }, [confirmPassword, email, firstName, hasStartedTyping, lastName, password]);

  const handleRegister = () => {
    console.log('handleRegister pressed', { firstName, lastName, email, role, ownerUserId });

    const normalizedEmail = email.trim().toLowerCase();
    const targetRole = isOwnerCreatingStaff ? role : 'owner';
    const validationMessage = getValidationMessage(
      {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      },
      true
    );

    if (validationMessage) {
      setErrorMessage(validationMessage);
      Alert.alert('Error', validationMessage);
      return;
    }

    if (isOwnerCreatingStaff && !['manager', 'worker'].includes(targetRole)) {
      const msg = 'Staff accounts can only be manager or worker';
      setErrorMessage(msg);
      Alert.alert('Error', msg);
      return;
    }

    setErrorMessage('');

    getUserByEmail(normalizedEmail, async existingUser => {
      if (existingUser) {
        const msg = 'An account with that email already exists';
        setErrorMessage(msg);
        Alert.alert('Error', msg);
        return;
      }

      try {
        const result = await createUser(
          firstName.trim(),
          lastName.trim(),
          normalizedEmail,
          password,
          targetRole,
          isOwnerCreatingStaff ? ownerUserId : null
        );

        try {
          const response = await fetch('http://192.168.100.26:3000/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: normalizedEmail,
              password,
              role: targetRole,
              owner_user_id: isOwnerCreatingStaff ? ownerUserId : null,
            }),
          });

          if (response.ok && result?.insertId) {
            markUserAsSynced(result.insertId);
          }

          Alert.alert(
            'Success',
            response.ok
              ? isOwnerCreatingStaff
                ? 'Staff account created and backed up to cloud'
                : 'Owner account created and backed up to cloud'
              : isOwnerCreatingStaff
                ? 'Staff account created locally (backup pending)'
                : 'Owner account created locally (backup pending)'
          );
        } catch (error) {
          console.log(error);
          Alert.alert(
            'Success',
            isOwnerCreatingStaff
              ? 'Staff account created locally (offline mode)'
              : 'Owner account created locally (offline mode)'
          );
        }

        if (isOwnerCreatingStaff) {
          navigation.goBack();
        } else {
          navigation.navigate('Login');
        }
      } catch (error) {
        console.log(error);
        Alert.alert('Error', 'Failed to create account locally');
      }
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{isOwnerCreatingStaff ? 'Create Staff Account' : 'Create Owner Account'}</Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Text style={styles.roleLabel}>
        {isOwnerCreatingStaff ? `Staff Role: ${role}` : 'Public sign-up creates owner accounts only'}
      </Text>

      {isOwnerCreatingStaff ? (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            activeOpacity={0.8}
            onPress={() => setShowRoleDropdown(previous => !previous)}
          >
            <Text style={styles.dropdownTriggerText}>
              {roleOptions.find(option => option.value === role)?.label ?? 'Select role'}
            </Text>
            <Text style={styles.dropdownChevron}>{showRoleDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showRoleDropdown ? (
            <View style={styles.dropdownMenu}>
              {roleOptions.map(option => {
                const isSelected = option.value === role;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setRole(option.value);
                      setShowRoleDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <TextInput
        placeholder="First Name"
        placeholderTextColor="#999"
        value={firstName}
        onChangeText={setFirstName}
        style={styles.input}
      />
      <TextInput
        placeholder="Last Name"
        placeholderTextColor="#999"
        value={lastName}
        onChangeText={setLastName}
        style={styles.input}
      />
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
          style={styles.passwordInput}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
          <Text style={styles.passwordToggleText}>{showPassword ? '\u{1F648}' : '\u{1F441}'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.passwordField}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.passwordInput}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle}>
          <Text style={styles.passwordToggleText}>{showConfirmPassword ? '\u{1F648}' : '\u{1F441}'}</Text>
        </TouchableOpacity>
      </View>

      <Button
        title={isOwnerCreatingStaff ? 'Create Staff Account' : 'Create Owner Account'}
        onPress={handleRegister}
      />

      {!isOwnerCreatingStaff ? (
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already have an account? Login</Text>
        </TouchableOpacity>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#fde68a',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  roleLabel: {
    color: '#fff',
    marginBottom: 12,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownChevron: {
    color: '#475569',
    fontSize: 12,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownOptionSelected: {
    backgroundColor: '#dcfce7',
  },
  dropdownOptionText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
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
  loginLink: {
    marginTop: 10,
    color: '#bfdbfe',
    textAlign: 'center',
  },
});
