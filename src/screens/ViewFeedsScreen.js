import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteFeedRecord, getFeedRecordsByBatch, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

export default function ViewFeedsScreen({ route, navigation }) {
    const batchId = route?.params?.batchId;
    const userId = route?.params?.userId;

    const [records, setRecords] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const loadFeed = useCallback(() => {
        if (!batchId) {
        setRecords([]);
        return;
        }

        getFeedRecordsByBatch(batchId, data => {
        setRecords(data || []);
        });
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

        loadFeed();
        }, [loadFeed, userId])
    );

    const canDeleteFeed = ['owner', 'worker'].includes(currentUser?.role);
    const totalQuantity = records.reduce((sum, item) => sum + Number(item.feed_quantity || item.quantity || 0), 0);
    const columns = [
        { key: 'feed_type', title: 'Feed Type', width: 120 },
        { key: 'quantity', title: 'Quantity (kg)', width: 130 },
        { key: 'date', title: 'Recorded On', width: 210 },
        { key: 'actions', title: 'Actions', width: 120 },
    ];

    const handleDelete = id => {
        if (!canDeleteFeed) {
        Alert.alert('Access denied', 'Only owner and worker users can delete feed records.');
        return;
        }

        Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this feed record?',
        [
            { text: 'Cancel', style: 'cancel' },
            {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
                deleteFeedRecord(id);
                loadFeed();
            },
            },
        ]
        );
    };

    return (
        <ScreenBackground contentContainerStyle={styles.container}>
        <Text style={styles.title}>Feed Records</Text>
        <Text style={styles.total}>Total Feed Consumed: {totalQuantity} kg</Text>

        <View style={styles.actions}>
            <ButtonLink title="Record Feed" onPress={() => navigation.navigate('Feed', { batchId, userId })} />
        </View>

        <View style={styles.tableWrapper}>
            <DataTable
            columns={columns}
            data={records}
            keyExtractor={(item, index) => (item.feed_id || item.id || index).toString()}
            emptyText="No feed records yet"
            renderCell={(item, column) => {
                if (column.key === 'feed_type') {
                const label = item.feed_type
                    ? item.feed_type.charAt(0).toUpperCase() + item.feed_type.slice(1)
                    : 'N/A';
                return <Text style={styles.cellText}>{label}</Text>;
                }

                if (column.key === 'quantity') {
                return <Text style={styles.cellText}>{item.feed_quantity || item.quantity}</Text>;
                }

                if (column.key === 'date') {
                return <Text style={styles.cellText}>{item.date_recorded || item.date}</Text>;
                }

                if (column.key === 'actions') {
                return canDeleteFeed ? (
                    <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.feed_id || item.id)}>
                    <Text style={styles.dangerActionText}>Delete</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.viewOnlyText}>View only</Text>
                );
                }

                return null;
            }}
            />
        </View>
        </ScreenBackground>
    );
    }

    const ButtonLink = ({ title, onPress }) => (
    <TouchableOpacity style={styles.primaryAction} onPress={onPress}>
        <Text style={styles.primaryActionText}>{title}</Text>
    </TouchableOpacity>
    );

    const styles = StyleSheet.create({
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
    total: {
        marginBottom: 12,
        fontWeight: '700',
        color: '#fff',
    },
    actions: {
        marginBottom: 14,
    },
    tableWrapper: {
        marginTop: 8,
    },
    cellText: {
        color: '#334155',
    },
    primaryAction: {
        backgroundColor: '#1d4ed8',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    primaryActionText: {
        color: '#fff',
        fontWeight: '600',
    },
    dangerAction: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    dangerActionText: {
        color: '#b91c1c',
        fontWeight: '600',
    },
    viewOnlyText: {
        color: '#64748b',
        fontStyle: 'italic',
    },
    });
