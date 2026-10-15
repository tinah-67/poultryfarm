import React, { useMemo, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getUserByEmail, updateUserPassword } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { syncPendingBackup } from '../services/backupSync';

// Normalizes answers so recovery checks ignore case and extra spaces.
const normalizeRecoveryAnswer = value => String(value || '').trim().toLowerCase();

// Returns the first password validation message, or an empty string when valid.
const getPasswordValidationMessage = (password, confirmPassword) => {
  if (!password || !confirmPassword) {
    return 'Enter and confirm the new password.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (!/[A-Za-z]/.test(password)) {
    return 'Password must contain at least one letter.';
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one number.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  return '';
};

// Lets users reset a local account password using their saved recovery question.
export default function ForgotPasswordScreen({ navigation }) {
  // Stores account lookup and password reset form state.
  const [email, setEmail] = useState('');
  const [matchedUser, setMatchedUser] = useState(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Recomputes password validation as the user types.
  const passwordMessage = useMemo(
    () => getPasswordValidationMessage(newPassword, confirmPassword),
    [confirmPassword, newPassword]
  );

  // Finds the account and reveals the saved recovery question.
  const handleFindAccount = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Error', 'Enter the account email first.');
      return;
    }

    getUserByEmail(normalizedEmail, user => {
      if (!user) {
        Alert.alert('Account not found', 'This account is not available on this device right now.');
        return;
      }

      if (!String(user.recovery_question || '').trim() || !String(user.recovery_answer || '').trim()) {
        Alert.alert(
          'Recovery question unavailable',
          'This account does not have a recovery question on this device yet.'
        );
        return;
      }

      setMatchedUser(user);
      setAnswer('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    });
  };

  // Validates the recovery answer, updates the password, and tries to back it up.
  const handleResetPassword = () => {
    if (!matchedUser) {
      Alert.alert('Error', 'Find the account first.');
      return;
    }

    if (normalizeRecoveryAnswer(answer) !== normalizeRecoveryAnswer(matchedUser.recovery_answer)) {
      Alert.alert('Error', 'Recovery answer is incorrect.');
      return;
    }

    if (passwordMessage) {
      Alert.alert('Error', passwordMessage);
      return;
    }

    updateUserPassword(matchedUser.user_id, newPassword, async success => {
      if (!success) {
        Alert.alert('Error', 'Could not reset the password right now.');
        return;
      }

      let backupSucceeded = false;

      try {
        const syncResults = await syncPendingBackup();
        backupSucceeded = syncResults.some(item => item.key === 'users' && item.syncedCount > 0);
      } catch (error) {
        console.log('Backup pending after password reset', error);
      }

      Alert.alert(
        'Success',
        backupSucceeded
          ? 'Password reset successful and backed up.'
          : 'Password reset successful locally. Backup is still pending.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.helperText}>
        Reset your password using the recovery question saved for this account on this device.
      </Text>

      {/* Collects the email before showing the recovery-question panel. */}
      <TextInput
        placeholder="Account Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />

      <Button title="Find Account" onPress={handleFindAccount} />

      {/* Shows password reset fields only after a matching account is found. */}
      {matchedUser ? (
        <View style={styles.panel}>
          <Text style={styles.questionLabel}>Recovery Question</Text>
          <Text style={styles.questionText}>{matchedUser.recovery_question}</Text>

          <TextInput
            placeholder="Recovery Answer"
            placeholderTextColor="#999"
            value={answer}
            onChangeText={setAnswer}
            style={styles.input}
          />
          <View style={styles.passwordField}>
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#64748b"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              style={[styles.input, styles.passwordInput]}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
              onPress={() => setShowNewPassword(previous => !previous)}
              style={styles.passwordToggle}
            >
              <Text style={styles.passwordToggleText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordField}>
            <TextInput
              placeholder="Confirm New Password"
              placeholderTextColor="#64748b"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              style={[styles.input, styles.passwordInput]}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
              onPress={() => setShowConfirmPassword(previous => !previous)}
              style={styles.passwordToggle}
            >
              <Text style={styles.passwordToggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {passwordMessage ? <Text style={styles.warningText}>{passwordMessage}</Text> : null}

          <Button title="Reset Password" onPress={handleResetPassword} />
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Form layout, input, and recovery panel styles.
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  helperText: {
    color: '#e2e8f0',
    marginBottom: 16,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#0f172a',
  },
  passwordField: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    paddingRight: 68,
    marginBottom: 0,
  },
  passwordToggle: {
    position: 'absolute',
    top: 0,
    right: 8,
    bottom: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  panel: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionLabel: {
    color: '#d1fae5',
    fontWeight: '700',
    marginBottom: 6,
  },
  questionText: {
    color: '#fff',
    marginBottom: 14,
  },
  warningText: {
    color: '#fde68a',
    marginBottom: 10,
  },
});
