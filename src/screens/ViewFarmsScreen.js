import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAccessibleFarms, deleteFarm, updateFarm, getUserById } from '../database/db';
import DataTable from '../components/DataTable';

export default function ViewFarmsScreen({ navigation, route }) {
  const userId = route?.params?.userId ?? route?.params?.user_Id;
  const [farms, setFarms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingFarm, setEditingFarm] = useState(null);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadContext = useCallback((done) => {
    if (!userId) {
      setCurrentUser(null);
      setFarms([]);
      done && done();
      return;
    }

    getUserById(userId, user => {
      setCurrentUser(user);

      getAccessibleFarms(userId, data => {
        setFarms(data);
        done && done();
      });
    });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadContext();
    }, [loadContext])
  );

  const isOwner = currentUser?.role === 'owner';

  const handleDelete = (id) => {
    if (!isOwner) {
      Alert.alert('Access denied', 'Only owner users can delete farms.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this farm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFarm(id);
            loadContext();
          },
        },
      ]
    );
  };

  const startEdit = (farm) => {
    if (!isOwner) {
      Alert.alert('Access denied', 'Only owner users can edit farms.');
      return;
    }

    setEditingFarm(farm.farm_id);
    setNewName(farm.farm_name);
    setNewLocation(farm.location);
  };

  const saveEdit = () => {
    if (!isOwner) {
      Alert.alert('Access denied', 'Only owner users can edit farms.');
      return;
    }

    updateFarm(editingFarm, newName.trim(), newLocation.trim());
    setEditingFarm(null);
    loadContext();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadContext(() => setRefreshing(false));
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { key: 'farm_name', title: 'Farm Name', width: 160 },
      { key: 'location', title: 'Location', width: 170 },
      { key: 'batches', title: 'Batches', width: 140 },
    ];

    if (isOwner) {
      return [...baseColumns, { key: 'actions', title: 'Actions', width: 260 }];
    }

    return [...baseColumns, { key: 'actions', title: 'Actions', width: 160 }];
  }, [isOwner]);

  const filteredFarms = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return farms;
    }

    return farms.filter(farm =>
      [farm.farm_name, farm.location]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [farms, searchQuery]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {isOwner ? (
        <Button
          title="Add New Farm"
          onPress={() => navigation.navigate('Farm', userId ? { userId } : { user_Id: route?.params?.user_Id })}
        />
      ) : null}

      <Text style={styles.title}>Registered Farms</Text>
      <Text style={styles.helperText}>
        {isOwner
          ? 'Tap a row action to open batches, edit the farm, or remove it.'
          : 'These farms are linked to the owner account that created your login.'}
      </Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        placeholder="Search by farm name or location"
        placeholderTextColor="#64748b"
      />

      <DataTable
        columns={columns}
        data={filteredFarms}
        keyExtractor={(item) => item.farm_id.toString()}
        emptyText={
          searchQuery.trim()
            ? 'No farms match your search.'
            : isOwner
              ? 'No farms yet. Add one!'
              : 'No owner farms are linked to this account yet.'
        }
        renderCell={(item, column) => {
          if (editingFarm === item.farm_id && isOwner) {
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
                      userId,
                    })
                  }
                >
                  <Text style={styles.primaryActionText}>View Batches</Text>
                </TouchableOpacity>

                {isOwner ? (
                  <TouchableOpacity style={styles.secondaryAction} onPress={() => startEdit(item)}>
                    <Text style={styles.secondaryActionText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}

                {isOwner ? (
                  <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.farm_id)}>
                    <Text style={styles.dangerActionText}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
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
