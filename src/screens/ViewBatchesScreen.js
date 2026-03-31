import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBatches, deleteBatch } from '../database/db';

export default function ViewBatchesScreen({ navigation, route }) {
    const farmId = route?.params?.farmId;
    const farmName = route?.params?.farmName;

    const [batches, setBatches] = useState([]);

    const loadBatches = () => {
        if (!farmId) return;

        getBatches(farmId, (data) => {
        setBatches(data);
        });
    };

    useFocusEffect(
        useCallback(() => {
            if (!farmId) {
                return;
            }

            getBatches(farmId, (data) => {
                setBatches(data);
            });
        }, [farmId])
    );

    return (
        <View style={styles.container}>
        <Text style={styles.title}>Batches</Text>
        {farmName ? <Text style={styles.subtitle}>Farm: {farmName}</Text> : null}

        <Button
            title="Add Batch"
            onPress={() => navigation.navigate("CreateBatch", { farmId })}
        />

        <FlatList
            data={batches}
            keyExtractor={(item) => item.batch_id.toString()}
            renderItem={({ item }) => (
            <View style={styles.card}>
                <Text>Breed: {item.breed}</Text>
                <Text>Chicks: {item.initial_chicks}</Text>
                <Text>Status: {item.status}</Text>

                <Button
                title="View Details"
                onPress={() =>
                    navigation.navigate("BatchDetails", {
                        batchId: item.batch_id,
                        farmId,
                        farmName,
                    })
                }
                />

                <Button
                title="Delete"
                onPress={() => {
                    deleteBatch(item.batch_id);
                    loadBatches();
                }}
                />
            </View>
            )}
        />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 20, marginBottom: 10 },
    subtitle: { marginBottom: 10, color: '#666' },
    card: {
        padding: 15,
        borderWidth: 1,
        marginVertical: 10,
        borderRadius: 5
    }      
});
