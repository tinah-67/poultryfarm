import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addFeedRecord, getFeedRecordsByBatch, deleteFeedRecord } from '../database/db';

export default function FeedScreen({ route }) {
    const batchId = route?.params?.batchId;

    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [records, setRecords] = useState([]);

    // LOAD DATA
    const loadFeed = () => {
        if (!batchId) {
            console.log("No batchId found");
            return;
        }

        getFeedRecordsByBatch(batchId, (data) => {
            console.log("FEED DATA:", data);
            setRecords(data || []);
        });
    };

    useFocusEffect(
        useCallback(() => {
            console.log("Batch ID:", batchId);
            if (!batchId) {
                console.log("No batchId found");
                return;
            }

            getFeedRecordsByBatch(batchId, (data) => {
                console.log("FEED DATA:", data);
                setRecords(data || []);
            });
        }, [batchId])
    );

    // ADD FEED
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
                loadFeed(); // refresh list
            }
        );
    };

    // DELETE FEED
    const handleDelete = (id) => {
        deleteFeedRecord(id);
        loadFeed();
    };

    // TOTAL COST (safe fallback fields)
    const totalCost = records.reduce((sum, item) => {
        return sum + (item.feed_cost || item.cost || 0);
    }, 0);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Feed Management</Text>

            {/* INPUTS */}
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

            {/* TOTAL */}
            <Text style={styles.total}>
                Total Feed Cost: {totalCost}
            </Text>

            {/* LIST */}
            <FlatList
                data={records}
                keyExtractor={(item, index) =>
                    (item.feed_id || item.id || index).toString()
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text>
                            Qty: {item.feed_quantity || item.quantity} kg
                        </Text>
                        <Text>
                            Cost: {item.feed_cost || item.cost}
                        </Text>
                        <Text>
                            Date: {item.date_recorded || item.date}
                        </Text>

                        <Button
                            title="Delete"
                            onPress={() =>
                                handleDelete(item.feed_id || item.id)
                            }
                        />
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No feed records yet</Text>}
            />
        </View>
    );
}

// STYLES
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20
    },
    title: {
        fontSize: 20,
        marginBottom: 10
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20
    },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 5
    },
    card: {
        padding: 10,
        borderWidth: 1,
        marginVertical: 5,
        borderRadius: 5
    },
    total: {
        marginTop: 10,
        marginBottom: 10,
        fontWeight: 'bold'
    }
});
