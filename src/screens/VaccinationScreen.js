import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addVaccinationRecord, getVaccinationRecordsByBatchId, deleteVaccinationRecord, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  DateTimePicker = null;
}

export default function VaccinationScreen({ route }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [vaccineName, setVaccineName] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState([]);
  const [pickerField, setPickerField] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getVaccinationRecordsByBatchId(batchId, setRecords);
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }

      loadRecords();
    }, [loadRecords, userId])
  );

  const canRecordVaccination = currentUser?.role === 'worker';

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
      Alert.alert('Access denied', 'Only worker users can record vaccinations.');
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
        loadRecords();
      }
    );
  };

  const handleDelete = (vaccinationId) => {
    if (!canRecordVaccination) {
      Alert.alert('Access denied', 'Only worker users can delete vaccination records.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this vaccination record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteVaccinationRecord(vaccinationId);
            loadRecords();
          },
        },
      ]
    );
  };

  const columns = [
    { key: 'vaccine_name', title: 'Vaccine', width: 170 },
    { key: 'vaccination_date', title: 'Date Given', width: 140 },
    { key: 'next_due_date', title: 'Next Due', width: 140 },
    { key: 'notes', title: 'Notes', width: 200 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vaccination Records</Text>
      <Text style={styles.helperText}>
        {canRecordVaccination
          ? 'Workers can add and remove vaccination records for this batch.'
          : 'You can view vaccination records here. Only workers can record or delete them.'}
      </Text>
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
      <Button title="Add Vaccination Record" onPress={handleAdd} disabled={!canRecordVaccination} />

      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(item, index) => (item.vaccination_id || index).toString()}
          emptyText="No vaccination records yet"
          renderCell={(item, column) => {
            if (column.key === 'vaccine_name') {
              return <Text style={styles.cellText}>{item.vaccine_name}</Text>;
            }

            if (column.key === 'vaccination_date') {
              return <Text style={styles.cellText}>{item.vaccination_date}</Text>;
            }

            if (column.key === 'next_due_date') {
              return <Text style={styles.cellText}>{item.next_due_date || 'N/A'}</Text>;
            }

            if (column.key === 'notes') {
              return <Text style={styles.cellText}>{item.notes || 'N/A'}</Text>;
            }

            if (column.key === 'actions') {
              return (
                canRecordVaccination ? (
                  <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.vaccination_id)}>
                    <Text style={styles.dangerActionText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.viewOnlyText}>View only</Text>
                )
              );
            }

            return null;
          }}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  helperText: { color: '#e2e8f0', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateInput: { flex: 1, marginBottom: 0 },
  dateField: { justifyContent: 'center' },
  dateButton: { marginLeft: 10, padding: 10, backgroundColor: '#1d4ed8', borderRadius: 5 },
  dateButtonText: { color: '#fff' },
  dateValue: { color: '#000' },
  datePlaceholder: { color: '#666' },
  tableWrapper: { marginTop: 16 },
  cellText: { color: '#334155' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
  viewOnlyText: { color: '#64748b', fontStyle: 'italic' },
});
