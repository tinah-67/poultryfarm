import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getBatches,
    deleteBatch,
    getUserById,
    updateBatchDetails,
} from '../database/db';
import DataTable from '../components/DataTable';

// Lists batches for one farm and supports search, filtering, editing, and deletion.
export default function ViewBatchesScreen({ navigation, route }) {
    // Stores route context, batch data, current user, edit fields, filters, and refresh state.
    const farmId = route?.params?.farmId;
    const farmName = route?.params?.farmName;
    const userId = route?.params?.userId;

    const [batches, setBatches] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingBatch, setEditingBatch] = useState(null);
    const [editedStartDate, setEditedStartDate] = useState('');
    const [editedBreed, setEditedBreed] = useState('');
    const [editedInitialChicks, setEditedInitialChicks] = useState('');
    const [editedPurchaseCost, setEditedPurchaseCost] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    // Loads active batches for the selected farm.
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

    // Loads the current user so batch management actions can be restricted.
    const loadUser = useCallback(() => {
        if (!userId) {
            setCurrentUser(null);
            return;
        }

        getUserById(userId, user => {
            setCurrentUser(user);
        });
    }, [userId]);

    // Refreshes user and batch data whenever the screen receives focus.
    useFocusEffect(
        useCallback(() => {
            loadUser();
            loadBatches();
        }, [loadBatches, loadUser])
    );

    // Computes management permission and the table columns for this role.
    const canManageBatches = ['owner', 'manager'].includes(currentUser?.role);

    const columns = useMemo(() => [
        { key: 'batch_id', title: 'Batch ID', width: 100 },
        { key: 'start_date', title: 'Start Date', width: 130 },
        { key: 'breed', title: 'Breed', width: 160 },
        { key: 'initial_chicks', title: 'Chicks', width: 110 },
        { key: 'status', title: 'Status', width: 120 },
        { key: 'actions', title: 'Actions', width: canManageBatches ? 310 : 140 },
    ], [canManageBatches]);

    // Applies text search and status filtering to the batch list.
    const filteredBatches = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        return batches.filter(batch => {
            const matchesStatus =
                statusFilter === 'all' ||
                String(batch.status || '').toLowerCase() === statusFilter;

            if (!matchesStatus) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return [
                batch.batch_id,
                batch.start_date,
                batch.breed,
                batch.initial_chicks,
                batch.status,
            ]
                .filter(value => value !== null && value !== undefined)
                .some(value => String(value).toLowerCase().includes(normalizedQuery));
        });
    }, [batches, searchQuery, statusFilter]);

    // Starts inline editing for one batch row.
    const startEdit = (batch) => {
        if (!canManageBatches) {
            Alert.alert('Access denied', 'Only owner and manager users can edit batches.');
            return;
        }

        setEditingBatch(batch.batch_id);
        setEditedStartDate(batch.start_date || '');
        setEditedBreed(batch.breed || '');
        setEditedInitialChicks(String(batch.initial_chicks ?? ''));
        setEditedPurchaseCost(String(batch.purchase_cost ?? '0'));
    };

    // Clears the inline batch edit form.
    const cancelEdit = () => {
        setEditingBatch(null);
        setEditedStartDate('');
        setEditedBreed('');
        setEditedInitialChicks('');
        setEditedPurchaseCost('');
    };

    // Validates and saves inline batch edits.
    const saveEdit = () => {
        if (!canManageBatches) {
            Alert.alert('Access denied', 'Only owner and manager users can edit batches.');
            return;
        }

        if (!editedStartDate.trim() || !editedBreed.trim() || !editedInitialChicks.trim()) {
            Alert.alert('Error', 'Enter start date, breed, and initial chicks.');
            return;
        }

        if (!/^\d+$/.test(editedInitialChicks.trim()) || Number(editedInitialChicks) <= 0) {
            Alert.alert('Error', 'Initial chicks must be a positive number.');
            return;
        }

        if (editedPurchaseCost.trim() && (Number.isNaN(Number(editedPurchaseCost)) || Number(editedPurchaseCost) < 0)) {
            Alert.alert('Error', 'Purchase cost must be 0 or more.');
            return;
        }

        const batchBeingEdited = batches.find(item => item.batch_id === editingBatch);
        const nextStatus = batchBeingEdited?.status || 'active';

        updateBatchDetails(
            editingBatch,
            editedStartDate.trim(),
            editedBreed.trim(),
            Number(editedInitialChicks),
            editedPurchaseCost.trim() === '' ? 0 : Number(editedPurchaseCost),
            nextStatus,
            () => {
                cancelEdit();
                loadBatches();
            }
        );
    };

    // Confirms and soft-deletes a batch when the role allows it.
    const handleDelete = (batchId) => {
        if (!canManageBatches) {
            Alert.alert('Access denied', 'Only owner and manager users can delete batches.');
            return;
        }

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

    // Handles pull-to-refresh for the batch list.
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
        <Text style={styles.helperText}>
            {canManageBatches
                ? 'Tap the buttons to add, edit, and remove batches.'
                : 'You can view batch details here.'}
        </Text>

        {/* Lets the user search across batch fields. */}
        <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholder="Search by batch ID, date, breed, chicks, or status"
            placeholderTextColor="#64748b"
        />

        {/* Filters batches by status. */}
        <View style={styles.filterRow}>
            {['all', 'active', 'completed'].map(filter => (
                <TouchableOpacity
                    key={filter}
                    style={[
                        styles.filterChip,
                        statusFilter === filter && styles.filterChipActive,
                    ]}
                    onPress={() => setStatusFilter(filter)}
                >
                    <Text
                        style={[
                            styles.filterChipText,
                            statusFilter === filter && styles.filterChipTextActive,
                        ]}
                    >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* Owners and managers can create new batches for this farm. */}
        {canManageBatches ? (
            <Button
                title="Add Batch"
                onPress={() => navigation.navigate("CreateBatch", { farmId, userId })}
            />
        ) : null}

        {/* Displays batch records and row actions in a reusable table. */}
        <View style={styles.tableWrapper}>
        <DataTable
            columns={columns}
            data={filteredBatches}
            keyExtractor={(item) => item.batch_id.toString()}
                    emptyText={
                        searchQuery.trim() || statusFilter !== 'all'
                            ? 'No batches match your search.'
                            : 'No batches yet. Add one for this farm.'
                    }
                    renderCell={(item, column) => {
                        if (editingBatch === item.batch_id && canManageBatches) {
                            if (column.key === 'batch_id') {
                                return <Text style={styles.batchIdText}>#{item.batch_id}</Text>;
                            }

                            if (column.key === 'start_date') {
                                return (
                                    <TextInput
                                        value={editedStartDate}
                                        onChangeText={setEditedStartDate}
                                        placeholder="YYYY-MM-DD"
                                        style={styles.input}
                                    />
                                );
                            }

                            if (column.key === 'breed') {
                                return (
                                    <TextInput
                                        value={editedBreed}
                                        onChangeText={setEditedBreed}
                                        placeholder="Breed"
                                        style={styles.input}
                                    />
                                );
                            }

                            if (column.key === 'initial_chicks') {
                                return (
                                    <TextInput
                                        value={editedInitialChicks}
                                        onChangeText={setEditedInitialChicks}
                                        placeholder="Chicks"
                                        keyboardType="numeric"
                                        style={styles.input}
                                    />
                                );
                            }

                            if (column.key === 'status') {
                                return (
                                    <View style={styles.editFields}>
                                    <TextInput
                                        value={editedPurchaseCost}
                                        onChangeText={setEditedPurchaseCost}
                                        placeholder="Purchase Cost"
                                        keyboardType="numeric"
                                        style={styles.input}
                                    />
                                    <Text style={styles.statusHelperText}>
                                        Status changes are handled from Batch Details. Completed batches cannot be reactivated.
                                    </Text>
                                    </View>
                                );
                            }

                            if (column.key === 'actions') {
                                return (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={styles.primaryAction} onPress={saveEdit}>
                                            <Text style={styles.primaryActionText}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.secondaryAction} onPress={cancelEdit}>
                                            <Text style={styles.secondaryActionText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }
                        }

                        if (column.key === 'batch_id') {
                            return <Text style={styles.batchIdText}>#{item.batch_id}</Text>;
                        }

                        if (column.key === 'start_date') {
                            return <Text style={styles.cellText}>{item.start_date}</Text>;
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
                                        userId,
                                    })
                                }
                            >
                                <Text style={styles.primaryActionText}>View Details</Text>
                            </TouchableOpacity>
                            {canManageBatches ? (
                                <TouchableOpacity
                                    style={styles.secondaryAction}
                                    onPress={() => startEdit(item)}
                                >
                                    <Text style={styles.secondaryActionText}>Edit</Text>
                                </TouchableOpacity>
                            ) : null}
                            {canManageBatches ? (
                                <TouchableOpacity
                                    style={styles.dangerAction}
                                    onPress={() => handleDelete(item.batch_id)}
                                >
                                    <Text style={styles.dangerActionText}>Delete</Text>
                                </TouchableOpacity>
                            ) : null}
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
    // Batch list layout, filters, table cells, edit fields, and action styles.
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    contentContainer: { padding: 20 },
    title: { fontSize: 20, marginBottom: 10, color: '#0f172a', fontWeight: '700' },
    subtitle: { marginBottom: 6, color: '#475569' },
    helperText: { marginBottom: 12, color: '#64748b' },
    searchInput: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
        color: '#0f172a',
        marginBottom: 14,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
    },
    filterChipActive: {
        backgroundColor: '#1d4ed8',
    },
    filterChipText: {
        color: '#334155',
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    tableWrapper: { marginTop: 16 },
    batchIdText: { color: '#0f172a', fontWeight: '700' },
    cellText: { color: '#334155' },
    input: {
        borderWidth: 1,
        borderColor: '#94a3b8',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    editFields: {
        gap: 8,
    },
    statusHelperText: {
        color: '#475569',
        fontSize: 12,
        lineHeight: 18,
    },
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
    secondaryAction: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    secondaryActionText: {
        color: '#0f172a',
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
