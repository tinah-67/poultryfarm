import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFarms, deleteFarm, updateFarm } from '../database/db';
import { Alert } from 'react-native';
import DataTable from '../components/DataTable';

export default function ViewFarmsScreen({ navigation, route }) {
    const userId = route?.params?.userId ?? route?.params?.user_Id;
    const [farms, setFarms] = useState([]);
    const [editingFarm, setEditingFarm] = useState(null);
    const [newName, setNewName] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadFarms = useCallback((done) => {
        if (!userId) {
            done && done();
            return;
        }

        getFarms(userId, (data) => {
            setFarms(data);
            done && done();
        });
    }, [userId]);

useFocusEffect(
    useCallback(() => {
        loadFarms();
    }, [loadFarms])
);

const handleDelete = (id) => {
    Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this farm?",
        [
        { text: "Cancel", style: "cancel" },
        {
            text: "Delete",
            style: "destructive",
            onPress: () => {
            deleteFarm(id);
            loadFarms();
            }
        }
        ]
    );
    };

const startEdit = (farm) => {
    setEditingFarm(farm.farm_id);
    setNewName(farm.farm_name);
    setNewLocation(farm.location);
};

const saveEdit = () => {
    updateFarm(editingFarm, newName, newLocation);
    setEditingFarm(null);
    loadFarms();
};

const handleRefresh = () => {
    setRefreshing(true);
    loadFarms(() => setRefreshing(false));
};

const columns = [
    { key: 'farm_name', title: 'Farm Name', width: 160 },
    { key: 'location', title: 'Location', width: 170 },
    { key: 'batches', title: 'Batches', width: 140 },
    { key: 'actions', title: 'Actions', width: 260 },
];

return (
    <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
        <Button
        title="Add New Farm"
        onPress={() => navigation.navigate('Farm', userId ? { userId } : { user_Id: route?.params?.user_Id })}
        />
    <Text style={styles.title}>Registered Farms</Text>
    <Text style={styles.helperText}>Tap a row action to open batches, edit the farm, or remove it.</Text>

    <DataTable
        columns={columns}
        data={farms}
        keyExtractor={(item) => item.farm_id.toString()}
        emptyText="No farms yet. Add one!"
        renderCell={(item, column) => {
            if (editingFarm === item.farm_id) {
                if (column.key === 'farm_name') {
                    return (
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            style={styles.input}
                            placeholder="Farm name"
                        />
                    );
                }

                if (column.key === 'location') {
                    return (
                        <TextInput
                            value={newLocation}
                            onChangeText={setNewLocation}
                            style={styles.input}
                            placeholder="Location"
                        />
                    );
                }

                if (column.key === 'batches') {
                    return <Text style={styles.cellText}>Save first</Text>;
                }

                if (column.key === 'actions') {
                    return (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.primaryAction} onPress={saveEdit}>
                                <Text style={styles.primaryActionText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryAction} onPress={() => setEditingFarm(null)}>
                                <Text style={styles.secondaryActionText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }
            }

            if (column.key === 'farm_name') {
                return <Text style={styles.name}>{item.farm_name}</Text>;
            }

            if (column.key === 'location') {
                return <Text style={styles.cellText}>{item.location}</Text>;
            }

            if (column.key === 'batches') {
                return <Text style={styles.cellText}>Batch records</Text>;
            }

            if (column.key === 'actions') {
                return (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.primaryAction}
                            onPress={() =>
                                navigation.navigate('ViewBatches', {
                                    farmId: item.farm_id,
                                    farmName: item.farm_name,
                                })
                            }
                        >
                            <Text style={styles.primaryActionText}>View Batches</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryAction} onPress={() => startEdit(item)}>
                            <Text style={styles.secondaryActionText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.farm_id)}>
                            <Text style={styles.dangerActionText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                );
            }

            return null;
        }}
    />
    </ScrollView>
);
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    contentContainer: { padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: '#0f172a' },
    helperText: {
        color: '#475569',
        marginBottom: 12,
    },
    name: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#0f172a',
    },
    input: {
        borderWidth: 1,
        borderColor: '#94a3b8',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    cellText: {
        color: '#334155',
    },
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
