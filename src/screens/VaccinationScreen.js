import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addVaccinationRecord, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  DateTimePicker = null;
}

export default function VaccinationScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [vaccineName, setVaccineName] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerField, setPickerField] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }
    }, [userId])
  );

  const canRecordVaccination = ['owner', 'worker'].includes(currentUser?.role);

  const formatToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const handlePickerChange = (_, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setPickerField(null);
    }

    if (!selectedDate || !pickerField) {
      return;
    }

    const formattedDate = formatTodayFromDate(selectedDate);

    if (pickerField === 'vaccinationDate') {
      setVaccinationDate(formattedDate);
    }

    if (pickerField === 'nextDueDate') {
      setNextDueDate(formattedDate);
    }
  };

  const formatTodayFromDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const openPicker = (field) => {
    if (!DateTimePicker) {
      Alert.alert('Date Picker Not Ready', 'Rebuild the app to use the calendar picker. You can still use the Today button for now.');
      return;
    }

    setPickerField(field);
  };

  const setToday = (field) => {
    const today = formatToday();

    if (field === 'vaccinationDate') {
      setVaccinationDate(today);
    }

    if (field === 'nextDueDate') {
      setNextDueDate(today);
    }
  };

  const handleAdd = () => {
    if (!canRecordVaccination) {
      Alert.alert('Access denied', 'Only owner and worker users can record vaccinations.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!vaccineName.trim() || !vaccinationDate.trim()) {
      Alert.alert('Error', 'Enter vaccine name and vaccination date');
      return;
    }

    addVaccinationRecord(
      batchId,
      vaccineName.trim(),
      vaccinationDate.trim(),
      nextDueDate.trim(),
      notes.trim(),
      () => {
        setVaccineName('');
        setVaccinationDate('');
        setNextDueDate('');
        setNotes('');
        setPickerField(null);
        Alert.alert('Success', 'Vaccination record added');
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Vaccination</Text>
      {canRecordVaccination ? (
        <>
          <TextInput
            placeholder="Vaccine Name"
            placeholderTextColor="#666"
            value={vaccineName}
            onChangeText={setVaccineName}
            style={styles.input}
          />
          <View style={styles.dateContainer}>
            <TouchableOpacity onPress={() => openPicker('vaccinationDate')} style={[styles.input, styles.dateInput, styles.dateField]}>
              <Text style={vaccinationDate ? styles.dateValue : styles.datePlaceholder}>
                {vaccinationDate || 'Vaccination Date (YYYY-MM-DD)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setToday('vaccinationDate')} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>Today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateContainer}>
            <TouchableOpacity onPress={() => openPicker('nextDueDate')} style={[styles.input, styles.dateInput, styles.dateField]}>
              <Text style={nextDueDate ? styles.dateValue : styles.datePlaceholder}>
                {nextDueDate || 'Next Due Date (optional)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setToday('nextDueDate')} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>Today</Text>
            </TouchableOpacity>
          </View>
          {pickerField && DateTimePicker ? (
            <DateTimePicker
              value={
                pickerField === 'vaccinationDate' && vaccinationDate
                  ? new Date(vaccinationDate)
                  : pickerField === 'nextDueDate' && nextDueDate
                    ? new Date(nextDueDate)
                    : new Date()
              }
              mode="date"
              display="default"
              onChange={handlePickerChange}
            />
          ) : null}
          <TextInput
            placeholder="Notes (optional)"
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
            style={styles.input}
          />
          <Button title="Add Vaccination Record" onPress={handleAdd} />
        </>
      ) : (
        <Text style={styles.noteText}>You can review vaccination records, but only owners and workers can add vaccination entries.</Text>
      )}

      <View style={styles.actions}>
        <Button title="View Vaccination Records" onPress={() => navigation.navigate('ViewVaccinations', { batchId, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateInput: { flex: 1, marginBottom: 0 },
  dateField: { justifyContent: 'center' },
  dateButton: { marginLeft: 10, padding: 10, backgroundColor: '#1d4ed8', borderRadius: 5 },
  dateButtonText: { color: '#fff' },
  dateValue: { color: '#000' },
  datePlaceholder: { color: '#666' },
  actions: { marginTop: 14 },
});
