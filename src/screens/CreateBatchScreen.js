import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBatch } from '../database/db';

let DateTimePicker = null;
try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
    DateTimePicker = null;
}

export default function CreateBatchScreen({ navigation, route }) {
    const farmId = route?.params?.farmId;

    const [startDate, setStartDate] = useState('');
    const [breed, setBreed] = useState('');
    const [initialChicks, setInitialChicks] = useState('');
    const [chicksError, setChicksError] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const isFormValid = useMemo(() => {
        const isDateValid = startDate.trim() !== '';
        const isBreedValid = breed.trim() !== '';
        const isChicksValid = initialChicks.trim() !== '' && /^\d{1,4}$/.test(initialChicks) && Number(initialChicks) > 0;

        return isDateValid && isBreedValid && isChicksValid;
    }, [startDate, breed, initialChicks]);

    const handleChicksChange = (text) => {
        if (/^\d{0,4}$/.test(text)) {
            setInitialChicks(text);
            setChicksError('');
        } else {
            setChicksError('Only numbers, max 4 digits');
        }
    };

    const formatDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const handlePickerChange = (_, selectedDate) => {
        if (Platform.OS !== 'ios') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            setStartDate(formatDate(selectedDate));
        }
    };

    const openDatePicker = () => {
        if (!DateTimePicker) {
            Alert.alert('Date Picker Not Ready', 'Rebuild the app to use the calendar picker. You can still use the Today button for now.');
            return;
        }

        setShowDatePicker(true);
    };

    const setToday = () => {
        setStartDate(formatDate(new Date()));
    };

    const handleCreate = () => {
        if (!isFormValid) {
            Alert.alert("Error", "Please fill all fields correctly");
            return;
        }

        createBatch(
            farmId,
            startDate,
            breed,
            Number(initialChicks),
            () => {
                Alert.alert("Success", "Batch created");
                navigation.goBack();
            }
        );
    };

    return (
        <View style={styles.container}>
        <Text style={styles.title}>Create Batch</Text>

        <View style={styles.dateContainer}>
            <TouchableOpacity onPress={openDatePicker} style={[styles.input, styles.dateInput, styles.dateField]}>
                <Text style={startDate ? styles.dateValue : styles.datePlaceholder}>
                    {startDate || 'Start Date (YYYY-MM-DD)'}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={setToday} style={styles.dateButton}>
                <Text style={styles.dateButtonText}>Today</Text>
            </TouchableOpacity>
        </View>
        {showDatePicker && DateTimePicker ? (
            <DateTimePicker
                value={startDate ? new Date(startDate) : new Date()}
                mode="date"
                display="default"
                onChange={handlePickerChange}
            />
        ) : null}

        <TextInput
            placeholder="Breed"
            placeholderTextColor="#666"
            value={breed}
            onChangeText={setBreed}
            style={styles.input}
        />

        <TextInput
            placeholder="Initial Chicks"
            placeholderTextColor="#666"
            value={initialChicks}
            onChangeText={handleChicksChange}
            keyboardType="numeric"
            style={styles.input}
        />
        {chicksError ? <Text style={styles.errorText}>{chicksError}</Text> : null}

        <Button title="Create Batch" onPress={handleCreate} disabled={!isFormValid} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 20, marginBottom: 20 },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 15,
        borderRadius: 5
    },
    dateInput: {
        flex: 1
    },
    dateField: {
        justifyContent: 'center'
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15
    },
    dateButton: {
        marginLeft: 10,
        padding: 10,
        backgroundColor: '#007BFF',
        borderRadius: 5
    },
    dateButtonText: {
        color: '#fff'
    },
    dateValue: {
        color: '#000'
    },
    datePlaceholder: {
        color: '#666'
    },
    errorText: {
        color: 'red',
        marginBottom: 10
    }
});
