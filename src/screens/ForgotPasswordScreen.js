import React, { useMemo, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUserByEmail, updateUserPassword } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { syncPendingBackup } from '../services/backupSync';

const normalizeRecoveryAnswer = value => String(value || '').trim().toLowerCase();

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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [matchedUser, setMatchedUser] = useState(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMessage = useMemo(
    () => getPasswordValidationMessage(newPassword, confirmPassword),
    [confirmPassword, newPassword]
  );

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
    });
  };

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

      <TextInput
        placeholder="Account Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />

      <Button title="Find Account" onPress={handleFindAccount} />

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
          <TextInput
            placeholder="New Password"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            style={styles.input}
          />
          <TextInput
            placeholder="Confirm New Password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
          />

          {passwordMessage ? <Text style={styles.warningText}>{passwordMessage}</Text> : null}

          <Button title="Reset Password" onPress={handleResetPassword} />
        </View>
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
