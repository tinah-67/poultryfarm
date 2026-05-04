import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addVaccinationRecord, getBatchById, getUserById, markVaccinationDueCompleted } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

// Loads the optional native date picker when the dependency is available.
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  DateTimePicker = null;
}

// Lists common broiler vaccines and suggested follow-up timing.
const VACCINE_OPTIONS = [
  {
    name: 'Newcastle disease',
    scheduleLabel: 'Usually first dose around day 5-7, booster around day 18-21',
    nextDueAgeDays: 21,
  },
  {
    name: 'Gumboro / IBD',
    scheduleLabel: 'Usually around day 10-14, repeat around day 18-21',
    nextDueAgeDays: 21,
  },
  {
    name: 'Infectious bronchitis',
    scheduleLabel: 'Commonly given at day 1 or within the first week',
    nextDueAgeDays: null,
  },
  {
    name: 'Marek’s disease',
    scheduleLabel: 'Usually given at day-old chick stage',
    nextDueAgeDays: null,
  },
  {
    name: 'Coccidiosis',
    scheduleLabel: 'Often handled at day-old stage depending on farm program',
    nextDueAgeDays: null,
  },
];

// Calculates the batch age in whole days for vaccination suggestions.
const getAgeInDays = startDate => {
  const parsedStartDate = new Date(String(startDate || '').trim());

  if (Number.isNaN(parsedStartDate.getTime())) {
    return null;
  }

  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedStartDate = new Date(
    parsedStartDate.getFullYear(),
    parsedStartDate.getMonth(),
    parsedStartDate.getDate()
  );

  return Math.floor((normalizedToday.getTime() - normalizedStartDate.getTime()) / (24 * 60 * 60 * 1000));
};

// Suggests vaccines based on the batch's current age.
const getSuggestedVaccinesForAge = ageInDays => {
  if (ageInDays == null || ageInDays < 0) {
    return [];
  }

  if (ageInDays <= 3) {
    return ['Marek’s disease', 'Infectious bronchitis', 'Coccidiosis'];
  }

  if (ageInDays <= 8) {
    return ['Newcastle disease', 'Infectious bronchitis'];
  }

  if (ageInDays <= 15) {
    return ['Gumboro / IBD'];
  }

  if (ageInDays <= 24) {
    return ['Newcastle disease', 'Gumboro / IBD'];
  }

  return [];
};

// Lets owner and worker users record vaccinations and complete follow-up reminders.
export default function VaccinationScreen({ route, navigation }) {
  // Stores route context, vaccination fields, picker state, and role/batch data.
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const prefilledVaccineName = route?.params?.prefilledVaccineName;
  const prefilledDueDate = route?.params?.prefilledDueDate;
  const sourceVaccinationId = route?.params?.sourceVaccinationId;
  const [vaccineName, setVaccineName] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerField, setPickerField] = useState(null);
  const [showVaccineDropdown, setShowVaccineDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [batch, setBatch] = useState(null);

  // Reloads role, batch status, and any prefilled follow-up details on focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }

      if (batchId) {
        getBatchById(batchId, batchRecord => {
          setBatch(batchRecord);
        });
      } else {
        setBatch(null);
      }

      setVaccineName(prefilledVaccineName ? String(prefilledVaccineName) : '');
      setShowVaccineDropdown(false);
    }, [batchId, prefilledVaccineName, userId])
  );

  const canRecordVaccination = ['owner', 'worker'].includes(currentUser?.role);
  const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';

  // Returns today's local date at midnight.
  const getTodayDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  // Parses a date string into a comparable local date.
  const parseComparableDate = value => {
    const rawValue = String(value || '').trim();

    if (!rawValue) {
      return null;
    }

    const parsedDate = new Date(rawValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  };

  const todayDate = getTodayDate();

  // Adds days to a local date for suggested follow-up dates.
  const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  };

  // Formats today's date for the vaccination date field.
  const formatToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const todayText = formatToday();
  const selectedVaccineOption = VACCINE_OPTIONS.find(option => option.name === vaccineName) || null;
  const batchAgeInDays = getAgeInDays(batch?.start_date);
  const suggestedVaccines = getSuggestedVaccinesForAge(batchAgeInDays);

  // Suggests the next due date based on the vaccine schedule and batch start date.
  const getSuggestedNextDueDate = selectedVaccine => {
    const matchingVaccine = VACCINE_OPTIONS.find(option => option.name === selectedVaccine);
    const batchStartDate = parseComparableDate(batch?.start_date);

    if (!matchingVaccine?.nextDueAgeDays || !batchStartDate) {
      return '';
    }

    const dueDate = addDays(batchStartDate, matchingVaccine.nextDueAgeDays - 1);
    const normalizedDueDate = dueDate < todayDate ? todayDate : dueDate;

    return formatTodayFromDate(normalizedDueDate);
  };

  // Updates the selected date picker field and prevents past follow-up dates.
  const handlePickerChange = (_, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setPickerField(null);
    }

    if (!selectedDate || !pickerField) {
      return;
    }

    const formattedDate = formatTodayFromDate(selectedDate);
    const comparableDate = parseComparableDate(formattedDate);

    if (pickerField === 'nextDueDate' && comparableDate && comparableDate < todayDate) {
      Alert.alert('Invalid next due date', 'Next due date cannot be earlier than today.');
      return;
    }

    if (pickerField === 'nextDueDate') {
      setNextDueDate(formattedDate);
    }
  };

  // Formats a date as YYYY-MM-DD for storage and display.
  const formatTodayFromDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Opens the native date picker for the requested field.
  const openPicker = (field) => {
    if (!DateTimePicker) {
      Alert.alert('Date Picker Not Ready', 'Rebuild the app to use the calendar picker. You can still use the Today button for now.');
      return;
    }

    setPickerField(field);
  };

  // Applies a vaccine selection and fills a suggested next due date when possible.
  const handleSelectVaccine = selectedVaccine => {
    setVaccineName(selectedVaccine);
    setShowVaccineDropdown(false);

    if (prefilledDueDate) {
      return;
    }

    const suggestedDueDate = getSuggestedNextDueDate(selectedVaccine);
    setNextDueDate(suggestedDueDate);
  };

  // Sets a date field to today's date.
  const setToday = (field) => {
    if (field === 'nextDueDate') {
      setNextDueDate(todayText);
    }
  };

  // Validates permission, batch status, dates, and vaccine fields before saving.
  const handleAdd = () => {
    if (!canRecordVaccination) {
      Alert.alert('Access denied', 'Only owner and worker users can record vaccinations.');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'Vaccination entries are disabled for completed batches. You can still view past vaccination records.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!vaccineName.trim()) {
      Alert.alert('Error', 'Enter vaccine name');
      return;
    }

    const vaccinationComparableDate = parseComparableDate(todayText);
    const nextDueComparableDate = parseComparableDate(nextDueDate);

    if (!vaccinationComparableDate) {
      Alert.alert('Error', 'Enter a valid vaccination date');
      return;
    }

    if (vaccinationComparableDate > todayDate) {
      Alert.alert('Invalid vaccination date', 'Vaccination date cannot be later than today.');
      return;
    }

    if (nextDueDate.trim() && !nextDueComparableDate) {
      Alert.alert('Error', 'Enter a valid next due date');
      return;
    }

    if (nextDueComparableDate && nextDueComparableDate < todayDate) {
      Alert.alert('Invalid next due date', 'Next due date cannot be earlier than today.');
      return;
    }

    addVaccinationRecord(
      batchId,
      vaccineName.trim(),
      todayText,
      nextDueDate.trim(),
      notes.trim(),
      () => {
        const finalizeSuccess = () => {
          setVaccineName('');
          setNextDueDate('');
          setNotes('');
          setPickerField(null);
          Alert.alert('Success', 'Vaccination record added');
          navigation.setParams({
            prefilledVaccineName: undefined,
            prefilledDueDate: undefined,
            sourceVaccinationId: undefined,
          });
        };

        if (sourceVaccinationId) {
          markVaccinationDueCompleted(sourceVaccinationId, todayText, finalizeSuccess);
          return;
        }

        finalizeSuccess();
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Vaccination</Text>
      {prefilledDueDate ? (
        <Text style={styles.noteText}>
          Recording the follow-up dose for the vaccination that was due on {prefilledDueDate}.
        </Text>
      ) : null}
      {batchAgeInDays != null ? (
        <Text style={styles.noteText}>
          Batch age: {batchAgeInDays} day{batchAgeInDays === 1 ? '' : 's'}.
        </Text>
      ) : null}
      {suggestedVaccines.length ? (
        <Text style={styles.suggestionText}>
          Suggested for this age: {suggestedVaccines.join(', ')}.
        </Text>
      ) : null}
      {isBatchCompleted ? (
        <Text style={styles.lockedNote}>
          This batch is completed. New vaccination entries are disabled, but you can still view the existing records.
        </Text>
      ) : null}
      {/* Shows vaccination entry controls only when recording is allowed. */}
      {canRecordVaccination && !isBatchCompleted ? (
        <>
          <TextInput
            placeholder="Vaccine Name"
            placeholderTextColor="#666"
            value={vaccineName}
            onChangeText={text => {
              setVaccineName(text);
              setShowVaccineDropdown(false);
            }}
            style={styles.input}
          />
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              activeOpacity={0.8}
              onPress={() => setShowVaccineDropdown(previous => !previous)}
            >
              <Text style={styles.dropdownTriggerText}>
                {selectedVaccineOption?.name || 'Choose vaccine from list'}
              </Text>
              <Text style={styles.dropdownChevron}>{showVaccineDropdown ? '^' : 'v'}</Text>
            </TouchableOpacity>
            {showVaccineDropdown ? (
              <View style={styles.dropdownMenu}>
                {VACCINE_OPTIONS.map(option => {
                  const isSelected = option.name === vaccineName;

                  return (
                    <TouchableOpacity
                      key={option.name}
                      style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectVaccine(option.name)}
                    >
                      <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                        {option.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
          {selectedVaccineOption ? (
            <Text style={styles.scheduleHint}>{selectedVaccineOption.scheduleLabel}</Text>
          ) : null}
          <View style={[styles.input, styles.dateField, styles.fixedDateField]}>
            <Text style={styles.fixedDateLabel}>Vaccination Date</Text>
            <Text style={styles.dateValue}>{todayText}</Text>
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
                pickerField === 'nextDueDate' && nextDueDate
                  ? new Date(nextDueDate)
                  : new Date()
              }
              mode="date"
              display="default"
              minimumDate={pickerField === 'nextDueDate' ? todayDate : undefined}
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
      ) : isBatchCompleted ? null : (
        <Text style={styles.noteText}>You can review vaccination records, but only owners and workers can add vaccination entries.</Text>
      )}

      {/* Opens existing vaccination records for this batch. */}
      <View style={styles.actions}>
        <Button title="View Vaccination Records" onPress={() => navigation.navigate('ViewVaccinations', { batchId, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Vaccination form, dropdown, date picker, and action styles.
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  lockedNote: { color: '#fecaca', marginBottom: 12 },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  suggestionText: { color: '#fde68a', marginBottom: 12, fontWeight: '600' },
  scheduleHint: { color: '#bfdbfe', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  dropdownContainer: { marginBottom: 10 },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: { color: '#0f172a', fontSize: 15 },
  dropdownChevron: { color: '#475569', fontSize: 12 },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  dropdownOptionText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
  },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateInput: { flex: 1, marginBottom: 0 },
  dateField: { justifyContent: 'center' },
  fixedDateField: { marginBottom: 10 },
  fixedDateLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  dateButton: { marginLeft: 10, padding: 10, backgroundColor: '#1d4ed8', borderRadius: 5 },
  dateButtonText: { color: '#fff' },
  dateValue: { color: '#000' },
  datePlaceholder: { color: '#666' },
  actions: { marginTop: 14 },
});
