import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addFeedRecord, getFeedRecordsByBatch, deleteFeedRecord } from '../database/db';
import DataTable from '../components/DataTable';

export default function FeedScreen({ route }) {
    const batchId = route?.params?.batchId;

    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [records, setRecords] = useState([]);

    const loadFeed = () => {
        if (!batchId) {
            return;
        }

        getFeedRecordsByBatch(batchId, (data) => {
            setRecords(data || []);
        });
    };

    useFocusEffect(
        useCallback(() => {
            if (!batchId) {
                return;
            }

            getFeedRecordsByBatch(batchId, (data) => {
                setRecords(data || []);
            });
        }, [batchId])
    );

    const handleAdd = () => {
        if (!quantity || !cost) {
            Alert.alert("Error", "Enter quantity and cost");
            return;
        }

        if (!batchId) {
            Alert.alert("Error", "Batch not found");
            return;
        }

        addFeedRecord(
            batchId,
            Number(quantity),
            Number(cost),
            new Date().toISOString(),
            () => {
                setQuantity('');
                setCost('');
                loadFeed();
            }
        );
    };

    const handleDelete = (id) => {
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

    const totalCost = records.reduce((sum, item) => {
        return sum + (item.feed_cost || item.cost || 0);
    }, 0);

    const columns = [
        { key: 'quantity', title: 'Quantity (kg)', width: 130 },
        { key: 'cost', title: 'Cost', width: 120 },
        { key: 'date', title: 'Recorded On', width: 210 },
        { key: 'actions', title: 'Actions', width: 120 },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Feed Management</Text>
            <TextInput
                placeholder="Quantity (kg)"
                placeholderTextColor="#666"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={styles.input}
            />

            <TextInput
                placeholder="Cost"
                placeholderTextColor="#666"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                style={styles.input}
            />

            <Button title="Add Feed" onPress={handleAdd} />

            <Text style={styles.total}>Total Feed Cost: {totalCost}</Text>

            <View style={styles.tableWrapper}>
                <DataTable
                    columns={columns}
                    data={records}
                    keyExtractor={(item, index) => (item.feed_id || item.id || index).toString()}
                    emptyText="No feed records yet"
                    renderCell={(item, column) => {
                        if (column.key === 'quantity') {
                            return <Text style={styles.cellText}>{item.feed_quantity || item.quantity}</Text>;
                        }

                        if (column.key === 'cost') {
                            return <Text style={styles.cellText}>{item.feed_cost || item.cost}</Text>;
                        }

                        if (column.key === 'date') {
                            return <Text style={styles.cellText}>{item.date_recorded || item.date}</Text>;
                        }

                        if (column.key === 'actions') {
                            return (
                                <TouchableOpacity
                                    style={styles.dangerAction}
                                    onPress={() => handleDelete(item.feed_id || item.id)}
                                >
                                    <Text style={styles.dangerActionText}>Delete</Text>
                                </TouchableOpacity>
                            );
                        }

                        return null;
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f1f5f9',
    },
    title: {
        fontSize: 20,
        marginBottom: 10,
        color: '#0f172a',
        fontWeight: '700',
    },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        borderColor: '#cbd5e1',
    },
    total: {
        marginTop: 10,
        marginBottom: 10,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    tableWrapper: {
        marginTop: 8,
    },
    cellText: {
        color: '#334155',
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
});
