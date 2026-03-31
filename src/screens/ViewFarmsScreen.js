import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getFarms, deleteFarm, updateFarm } from '../database/db';
import { Alert } from 'react-native';

export default function ViewFarmsScreen({ navigation, route }) {
    console.log("ViewFarmsScreen rendered", route?.params);
    const userId = route?.params?.userId ?? route?.params?.user_Id;
    const [farms, setFarms] = useState([]);
    const [editingFarm, setEditingFarm] = useState(null);
    const [newName, setNewName] = useState('');
    const [newLocation, setNewLocation] = useState('');

    const loadFarms = () => {
        console.log("loadFarms called, userId:", userId);

        if (!userId) {
            console.log("No userId, skipping fetch");
            return;
        }

        getFarms(userId, (data) => {
            console.log("Filtered farms:", data);
            setFarms(data);
        });
    };

useFocusEffect(
    useCallback(() => {
        console.log("loadFarms called, userId:", userId);

        if (!userId) {
            console.log("No userId, skipping fetch");
            return;
        }

        getFarms(userId, (data) => {
            console.log("Filtered farms:", data);
            setFarms(data);
        });
    }, [userId])
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

return (
    <View style={styles.container}>
        <Button
        title="Add New Farm"
        onPress={() => navigation.navigate('Farm', userId ? { userId } : { user_Id: route?.params?.user_Id })}
        />
    <Text style={styles.title}>Registered Farms</Text>
    <Text style={{ color: '#666', marginBottom: 8 }}>current userId: {String(userId ?? route?.params?.user_Id ?? 'none')}</Text>
    

    <FlatList
        data={farms}
        keyExtractor={(item) => item.farm_id.toString()}

            ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20 }}>
            No farms yet. Add one!
            </Text>
        }

        renderItem={({ item }) => (
            <View style={styles.item}>

            {editingFarm === item.farm_id ? (
                <>
                <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    style={styles.input}
                />
                <TextInput
                    value={newLocation}
                    onChangeText={setNewLocation}
                    style={styles.input}
                />
                <Button title="Save" onPress={saveEdit} />
                <Button title="Cancel" onPress={() => setEditingFarm(null)} />
                </>
            ) : (
                <>
                <Text style={styles.name}>{item.farm_name}</Text>
                <Text>{item.location}</Text>

                <Button
                    title="View Batches"
                    onPress={() =>
                        navigation.navigate('ViewBatches', {
                            farmId: item.farm_id,
                            farmName: item.farm_name,
                        })
                    }
                />
                <Button title="Edit" onPress={() => startEdit(item)} />
                <Button title="Delete" onPress={() => handleDelete(item.farm_id)} />
                </>
            )}

            </View>
        )}
        />
    </View>
);
}

const styles = StyleSheet.create({
    container: { padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    item: {
    padding: 12,
    borderBottomWidth: 1,
    marginBottom: 10,
    },
    name: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        marginBottom: 5,
        padding: 5,
    },
    });
