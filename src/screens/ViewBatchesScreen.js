import React, { useCallback, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBatches, deleteBatch } from '../database/db';
import DataTable from '../components/DataTable';

export default function ViewBatchesScreen({ navigation, route }) {
    const farmId = route?.params?.farmId;
    const farmName = route?.params?.farmName;

    const [batches, setBatches] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const columns = [
        { key: 'batch_id', title: 'Batch ID', width: 100 },
        { key: 'breed', title: 'Breed', width: 160 },
        { key: 'initial_chicks', title: 'Chicks', width: 110 },
        { key: 'status', title: 'Status', width: 120 },
        { key: 'actions', title: 'Actions', width: 220 },
    ];

    const loadBatches = useCallback((done) => {
        if (!farmId) {
            done && done();
            return;
        }

        getBatches(farmId, (data) => {
            setBatches(data);
            done && done();
        });
    }, [farmId]);

    useFocusEffect(
        useCallback(() => {
            loadBatches();
        }, [loadBatches])
    );

    const handleDelete = (batchId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this batch?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteBatch(batchId);
                        loadBatches();
                    },
                },
            ]
        );
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadBatches(() => setRefreshing(false));
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
        <Text style={styles.title}>Batches</Text>
        {farmName ? <Text style={styles.subtitle}>Farm: {farmName}</Text> : null}
        <Text style={styles.helperText}>This table keeps the main batch details visible in one place.</Text>

        <Button
            title="Add Batch"
            onPress={() => navigation.navigate("CreateBatch", { farmId })}
        />

        <View style={styles.tableWrapper}>
        <DataTable
            columns={columns}
            data={batches}
            keyExtractor={(item) => item.batch_id.toString()}
            emptyText="No batches yet. Add one for this farm."
            renderCell={(item, column) => {
                if (column.key === 'batch_id') {
                    return <Text style={styles.batchIdText}>#{item.batch_id}</Text>;
                }

                if (column.key === 'breed') {
                    return <Text style={styles.cellText}>{item.breed}</Text>;
                }

                if (column.key === 'initial_chicks') {
                    return <Text style={styles.cellText}>{item.initial_chicks}</Text>;
                }

                if (column.key === 'status') {
                    return <Text style={styles.statusText}>{item.status}</Text>;
                }

                if (column.key === 'actions') {
                    return (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.primaryAction}
                                onPress={() =>
                                    navigation.navigate("BatchDetails", {
                                        batchId: item.batch_id,
                                        farmId,
                                        farmName,
                                    })
                                }
                            >
                                <Text style={styles.primaryActionText}>View Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dangerAction}
                                onPress={() => handleDelete(item.batch_id)}
                            >
                                <Text style={styles.dangerActionText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }

                return null;
            }}
        />
        </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    contentContainer: { padding: 20 },
    title: { fontSize: 20, marginBottom: 10, color: '#0f172a', fontWeight: '700' },
    subtitle: { marginBottom: 6, color: '#475569' },
    helperText: { marginBottom: 12, color: '#64748b' },
    tableWrapper: { marginTop: 16 },
    batchIdText: { color: '#0f172a', fontWeight: '700' },
    cellText: { color: '#334155' },
    statusText: { color: '#0f766e', fontWeight: '600', textTransform: 'capitalize' },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    primaryAction: {
        backgroundColor: '#1d4ed8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
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
    },
    dangerActionText: {
        color: '#b91c1c',
        fontWeight: '600',
    },
});     
