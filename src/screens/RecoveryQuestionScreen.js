import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getUserById, updateUserRecoveryQuestion } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { syncPendingBackup } from '../services/backupSync';
import { RECOVERY_QUESTIONS } from '../constants/recoveryQuestions';

export default function RecoveryQuestionScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRecoveryQuestionDropdown, setShowRecoveryQuestionDropdown] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    getUserById(userId, user => {
      setRecoveryQuestion(user?.recovery_question || '');
      setRecoveryAnswer('');
      setLoading(false);
    });
  }, [userId]);

  const handleSave = () => {
    if (!recoveryQuestion.trim() || !recoveryAnswer.trim()) {
      Alert.alert('Error', 'Enter both recovery question and recovery answer.');
      return;
    }

    if (!RECOVERY_QUESTIONS.includes(recoveryQuestion.trim())) {
      Alert.alert('Error', 'Select one recovery question.');
      return;
    }

    updateUserRecoveryQuestion(userId, recoveryQuestion, recoveryAnswer, async success => {
      if (!success) {
        Alert.alert('Error', 'Could not save recovery question right now.');
        return;
      }

      let backupSucceeded = false;

      try {
        const syncResults = await syncPendingBackup();
        backupSucceeded = syncResults.some(item => item.key === 'users' && item.syncedCount > 0);
      } catch (error) {
        console.log('Backup pending after recovery question update', error);
      }

      Alert.alert(
        'Success',
        backupSucceeded
          ? 'Recovery question saved and backed up.'
          : 'Recovery question saved locally. Backup is still pending.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    });
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Recovery Question</Text>
      <Text style={styles.helperText}>
        Set a recovery question so you can reset your password later if you forget it.
      </Text>

      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          activeOpacity={0.8}
          disabled={loading}
          onPress={() => setShowRecoveryQuestionDropdown(previous => !previous)}
        >
          <Text style={styles.dropdownTriggerText}>
            {recoveryQuestion || 'Select recovery question'}
          </Text>
          <Text style={styles.dropdownChevron}>{showRecoveryQuestionDropdown ? 'â–²' : 'â–¼'}</Text>
        </TouchableOpacity>

        {showRecoveryQuestionDropdown ? (
          <View style={styles.dropdownMenu}>
            {RECOVERY_QUESTIONS.map(question => {
              const isSelected = question === recoveryQuestion;

              return (
                <TouchableOpacity
                  key={question}
                  style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setRecoveryQuestion(question);
                    setShowRecoveryQuestionDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                    {question}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
      <TextInput
        placeholder="Recovery Answer"
        placeholderTextColor="#999"
        value={recoveryAnswer}
        onChangeText={setRecoveryAnswer}
        editable={!loading}
        style={styles.input}
      />

      <Button title="Save Recovery Question" onPress={handleSave} disabled={loading} />
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
    flex: 1,
    paddingRight: 12,
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
});
