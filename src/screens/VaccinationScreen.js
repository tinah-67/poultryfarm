import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addVaccinationRecord, getVaccinationRecordsByBatchId, deleteVaccinationRecord } from '../database/db';

let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  DateTimePicker = null;
}

export default function VaccinationScreen({ route }) {
  const batchId = route?.params?.batchId;
  const [vaccineName, setVaccineName] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState([]);
  const [pickerField, setPickerField] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getVaccinationRecordsByBatchId(batchId, setRecords);
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

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
        loadRecords();
      }
    );
  };

  const handleDelete = (vaccinationId) => {
    deleteVaccinationRecord(vaccinationId);
    loadRecords();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vaccination Records</Text>
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

      <FlatList
        data={records}
        keyExtractor={(item, index) => (item.vaccination_id || index).toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Vaccine: {item.vaccine_name}</Text>
            <Text>Date: {item.vaccination_date}</Text>
            <Text>Next Due: {item.next_due_date || 'N/A'}</Text>
            <Text>Notes: {item.notes || 'N/A'}</Text>
            <Button title="Delete" onPress={() => handleDelete(item.vaccination_id)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No vaccination records yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateInput: { flex: 1, marginBottom: 0 },
  dateField: { justifyContent: 'center' },
  dateButton: { marginLeft: 10, padding: 10, backgroundColor: '#007BFF', borderRadius: 5 },
  dateButtonText: { color: '#fff' },
  dateValue: { color: '#000' },
  datePlaceholder: { color: '#666' },
  card: { padding: 10, borderWidth: 1, marginVertical: 5, borderRadius: 5 },
  emptyText: { textAlign: 'center', marginTop: 20 },
});
