import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBatch, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

let DateTimePicker = null;
try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
    DateTimePicker = null;
}

export default function CreateBatchScreen({ navigation, route }) {
    const farmId = route?.params?.farmId;
    const userId = route?.params?.userId;

    const [startDate, setStartDate] = useState('');
    const [breed, setBreed] = useState('');
    const [initialChicks, setInitialChicks] = useState('');
    const [purchaseCost, setPurchaseCost] = useState('');
    const [chicksError, setChicksError] = useState('');
    const [costError, setCostError] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (!userId) {
            setCurrentUser(null);
            return;
        }

        getUserById(userId, user => {
            setCurrentUser(user);
        });
    }, [userId]);

    const canManageBatches = ['owner', 'manager'].includes(currentUser?.role);
    const isFormValid = useMemo(() => {
        const isDateValid = startDate.trim() !== '';
        const isBreedValid = breed.trim() !== '';
        const isChicksValid = initialChicks.trim() !== '' && /^\d{1,4}$/.test(initialChicks) && Number(initialChicks) > 0;
        const isCostValid = purchaseCost.trim() !== '' && !Number.isNaN(Number(purchaseCost)) && Number(purchaseCost) >= 0;

        return isDateValid && isBreedValid && isChicksValid && isCostValid;
    }, [startDate, breed, initialChicks, purchaseCost]);

    const handleChicksChange = (text) => {
        if (/^\d{0,4}$/.test(text)) {
            setInitialChicks(text);
            setChicksError('');
        } else {
            setChicksError('Only numbers, max 4 digits');
        }
    };

    const handlePurchaseCostChange = text => {
        if (/^\d*(\.\d{0,2})?$/.test(text)) {
            setPurchaseCost(text);
            setCostError('');
        } else {
            setCostError('Use numbers only, up to 2 decimal places');
        }
    };

    const formatDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const parseLocalDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);

        if (!year || !month || !day) {
            return new Date();
        }

        return new Date(year, month - 1, day);
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
        setShowDatePicker(false);
        setStartDate(formatDate(new Date()));
    };

    const handleCreate = () => {
        if (!canManageBatches) {
            Alert.alert('Access denied', 'Only owner and manager users can create batches.');
            return;
        }

        if (!isFormValid) {
            Alert.alert("Error", "Please fill all fields correctly, including chick purchase cost");
            return;
        }

        createBatch(
            farmId,
            startDate,
            breed,
            Number(initialChicks),
            purchaseCost.trim() === '' ? 0 : Number(purchaseCost),
            () => {
                Alert.alert("Success", "Batch created");
                navigation.goBack();
            }
        );
    };

    return (
        <ScreenBackground contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Batch</Text>
        <Text style={styles.helperText}>
            {canManageBatches
                ? 'Owners and managers can create new batches.'
                : 'You can view batches, but only owners and managers can create them.'}
        </Text>

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
                value={startDate ? parseLocalDate(startDate) : new Date()}
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

        <TextInput
            placeholder="Chick Purchase Cost"
            placeholderTextColor="#666"
            value={purchaseCost}
            onChangeText={handlePurchaseCostChange}
            keyboardType="numeric"
            style={styles.input}
        />
        {costError ? <Text style={styles.errorText}>{costError}</Text> : null}

        <Button title="Create Batch" onPress={handleCreate} disabled={!isFormValid || !canManageBatches} />
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 20, marginBottom: 20, color: '#fff', fontWeight: '700' },
    helperText: { color: '#e2e8f0', marginBottom: 12 },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 15,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    dateInput: {
        flex: 1,
        marginBottom: 0,
    },
    dateField: {
        justifyContent: 'center'
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginBottom: 15
    },
    dateButton: {
        marginLeft: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#007BFF',
        borderRadius: 5,
        justifyContent: 'center',
        alignSelf: 'center',
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
        color: '#fecaca',
        marginBottom: 10
    }
});
