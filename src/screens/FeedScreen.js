import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { addFeedRecord, getBatchById, getFeedAvailability, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

// Lets owner and worker users record feed usage for an active batch.
export default function FeedScreen({ route, navigation }) {
    // Stores route ids, feed form fields, stock information, and role/batch data.
    const batchId = route?.params?.batchId;
    const userId = route?.params?.userId;
    const feedTypeOptions = ['starter', 'grower', 'finisher'];

    const [feedType, setFeedType] = useState('starter');
    const [showFeedTypeDropdown, setShowFeedTypeDropdown] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [quantityError, setQuantityError] = useState('');
    const [remainingFeed, setRemainingFeed] = useState(null);
    const [remainingFeedMessage, setRemainingFeedMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [batch, setBatch] = useState(null);
    const formatCurrency = value => `KES ${Number(value || 0).toFixed(2)}`;

    // Loads the current user so feed-entry permissions can be enforced.
    useEffect(() => {
        if (userId) {
        getUserById(userId, user => {
            setCurrentUser(user);
        });
        } else {
        setCurrentUser(null);
        }
    }, [userId]);

    // Loads the batch so completed batches can be locked.
    useEffect(() => {
        if (!batchId) {
        setBatch(null);
        return;
        }

        getBatchById(batchId, batchRecord => {
        setBatch(batchRecord);
        });
    }, [batchId]);

    // Recalculates remaining feed whenever the batch or feed type changes.
    useEffect(() => {
        if (!batchId || !feedType) {
        setRemainingFeed(null);
        setRemainingFeedMessage('');
        return;
        }

        getFeedAvailability(
        batchId,
        feedType,
        availability => {
            if (!availability || availability.total_quantity <= 0) {
            setRemainingFeed(null);
            setRemainingFeedMessage(`No ${feedType} feed purchase has been recorded yet.`);
            return;
            }

            setRemainingFeed(availability.available_quantity);
            setRemainingFeedMessage('');
        },
        () => {
            setRemainingFeed(null);
            setRemainingFeedMessage(`No ${feedType} feed purchase has been recorded yet.`);
        }
        );
    }, [batchId, feedType]);

    // Computes role access and batch age details used for validation.
    const canRecordFeed = ['owner', 'worker'].includes(currentUser?.role);
    const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';
    // Parses stored batch dates without timezone shifts.
    const parseLocalDate = dateString => {
        const [year, month, day] = (dateString || '').split('-').map(Number);

        if (!year || !month || !day) {
        return null;
        }

        return new Date(year, month - 1, day);
    };

    // Calculates batch age in days from the start date.
    const getAgeInDays = startDate => {
        const batchStartDate = parseLocalDate(startDate);

        if (!batchStartDate) {
        return null;
        }

        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffMs = todayLocal.getTime() - batchStartDate.getTime();

        if (!Number.isFinite(diffMs)) {
        return null;
        }

        return Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);
    };

    // Chooses the expected feed stage based on batch age.
    const getRecommendedFeedType = ageInDays => {
        if (ageInDays == null) {
        return null;
        }

        if (ageInDays < 21) {
        return 'starter';
        }

        if (ageInDays < 35) {
        return 'grower';
        }

        return 'finisher';
    };

    const ageInDays = getAgeInDays(batch?.start_date);
    const ageInWeeks = ageInDays == null ? null : (ageInDays / 7).toFixed(1);
    const recommendedFeedType = getRecommendedFeedType(ageInDays);

    // Restricts feed quantity input to a short whole number.
    const handleQuantityChange = text => {
        if (/^\d{0,2}$/.test(text)) {
        setQuantity(text);
        setQuantityError('');
        } else {
        setQuantityError('Quantity must be numbers only, max 2 digits');
        }
    };

    // Validates permission, batch status, feed stage, quantity, and stock before saving.
    const handleAdd = () => {
        if (!canRecordFeed) {
        Alert.alert('Access denied', 'Only owner and worker users can record feed.');
        return;
        }

        if (isBatchCompleted) {
        Alert.alert('Batch completed', 'Feed entries are disabled for completed batches. You can still view past feed records.');
        return;
        }

        if (!feedType || !quantity) {
        Alert.alert('Error', 'Choose feed type and enter quantity');
        return;
        }

        if (!batchId) {
        Alert.alert('Error', 'Batch not found');
        return;
        }

        if (recommendedFeedType && feedType !== recommendedFeedType) {
        Alert.alert(
            'Wrong feed stage',
            `This batch is ${ageInDays} day(s) old (${ageInWeeks} weeks). Use ${recommendedFeedType.charAt(0).toUpperCase() + recommendedFeedType.slice(1)} feed.`
        );
        return;
        }

        if (!/^\d{1,2}$/.test(quantity)) {
        Alert.alert('Error', 'Quantity must be numbers only, max 2 digits');
        return;
        }

        const quantityValue = Number(quantity);

        if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        Alert.alert('Error', 'Quantity must be a valid number greater than 0');
        return;
        }

        addFeedRecord(
        batchId,
        feedType,
        quantityValue,
        new Date().toISOString(),
        result => {
            setFeedType('starter');
            setShowFeedTypeDropdown(false);
            setQuantity('');
            setQuantityError('');
            setRemainingFeed(result?.available_quantity ?? null);
            Alert.alert(
                'Success',
                `Feed record added. Cost: ${formatCurrency(result?.feed_cost)} at ${formatCurrency(result?.unit_cost)} per kg. Remaining ${feedType}: ${Number(result?.available_quantity || 0).toFixed(2)} kg.`
            );
        },
        error => {
            Alert.alert('Feed cost unavailable', error?.message || 'Record the farm feed purchase first.');
        }
        );
    };

    return (
        <ScreenBackground contentContainerStyle={styles.container}>
        <Text style={styles.title}>Record Feed</Text>
        {isBatchCompleted ? (
            <Text style={styles.lockedNote}>
            This batch is completed. New feed entries are disabled, but you can still view the existing records.
            </Text>
        ) : null}
        {recommendedFeedType ? (
            <Text style={styles.ageNote}>
            Batch age: {ageInDays} day(s) ({ageInWeeks} weeks). Recommended feed: {recommendedFeedType.charAt(0).toUpperCase() + recommendedFeedType.slice(1)}.
            </Text>
        ) : null}
        <Text style={styles.noteText}>
        Feed cost is calculated automatically from farm feed purchases recorded under farm expenses.
        </Text>

        {/* Shows feed type and quantity controls only when entry is allowed. */}
        {canRecordFeed && !isBatchCompleted ? (
            <>
            <View style={styles.dropdownContainer}>
                <TouchableOpacity
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
                onPress={() => setShowFeedTypeDropdown(previous => !previous)}
                >
                <Text style={styles.dropdownTriggerText}>
                    {feedType.charAt(0).toUpperCase() + feedType.slice(1)}
                </Text>
                <Text style={styles.dropdownChevron}>{showFeedTypeDropdown ? '^' : 'v'}</Text>
                </TouchableOpacity>

                {showFeedTypeDropdown ? (
                <View style={styles.dropdownMenu}>
                    {feedTypeOptions.map(option => {
                    const isSelected = option === feedType;

                    return (
                        <TouchableOpacity
                        key={option}
                        style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                        activeOpacity={0.8}
                        onPress={() => {
                            setFeedType(option);
                            setShowFeedTypeDropdown(false);
                        }}
                        >
                        <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                        </TouchableOpacity>
                    );
                    })}
                </View>
                ) : null}
            </View>

            {remainingFeedMessage ? (
                <Text style={styles.remainingFeedWarning}>{remainingFeedMessage}</Text>
            ) : (
                <Text style={styles.remainingFeedText}>
                Remaining {feedType}: {Number(remainingFeed || 0).toFixed(2)} kg
                </Text>
            )}

            <TextInput
                placeholder="Quantity (kg)"
                placeholderTextColor="#666"
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                style={styles.input}
            />
            {quantityError ? <Text style={styles.errorText}>{quantityError}</Text> : null}

            <Button title="Add Feed" onPress={handleAdd} />
            </>
        ) : isBatchCompleted ? null : (
            <Text style={styles.noteText}>You can review feed records, but only owners and workers can add feed entries.</Text>
        )}

        {/* Opens the historical feed records for this batch. */}
        <View style={styles.actions}>
            <Button title="View Feed Records" onPress={() => navigation.navigate('ViewFeeds', { batchId, userId })} />
        </View>
        </ScreenBackground>
    );
    }

    const styles = StyleSheet.create({
    // Feed form, stock warning, dropdown, and action styles.
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 20,
        marginBottom: 10,
        color: '#fff',
        fontWeight: '700',
    },
    noteText: {
        color: '#cbd5e1',
        marginBottom: 12,
    },
    lockedNote: {
        color: '#fecaca',
        marginBottom: 12,
    },
    ageNote: {
        color: '#bfdbfe',
        marginBottom: 12,
    },
    remainingFeedText: {
        color: '#dcfce7',
        marginBottom: 12,
        fontWeight: '600',
    },
    remainingFeedWarning: {
        color: '#fde68a',
        marginBottom: 12,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#cbd5e1',
    },
    errorText: {
        color: '#fecaca',
        marginBottom: 10,
    },
    dropdownContainer: {
        marginBottom: 12,
    },
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
        borderColor: '#cbd5e1',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
    },
    dropdownOption: {
        paddingHorizontal: 12,
        paddingVertical: 14,
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
    actions: {
        marginTop: 14,
    },
});
