import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteMortalityRecord, getMortalityRecordsByBatchId, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

// Shows mortality records for one batch and allows permitted users to delete them.
export default function ViewMortalityScreen({ route, navigation }) {
  // Stores route ids, loaded mortality rows, and current user role.
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Loads active mortality records for the selected batch.
  const loadRecords = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      return;
    }

    getMortalityRecordsByBatchId(batchId, setRecords);
  }, [batchId]);

  // Reloads the current role and mortality records whenever the screen receives focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => setCurrentUser(user));
      } else {
        setCurrentUser(null);
      }

      loadRecords();
    }, [loadRecords, userId])
  );

  // Computes summary values and table columns for the mortality list.
  const canDeleteMortality = ['owner', 'worker'].includes(currentUser?.role);
  const totalDead = records.reduce((sum, item) => sum + Number(item.number_dead || 0), 0);
  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return records;
    }

    return records.filter(item =>
      [item.number_dead, item.cause_of_death, item.date_recorded]
        .filter(value => value !== null && value !== undefined)
        .some(value => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [records, searchQuery]);
  const columns = [
    { key: 'number_dead', title: 'Number Dead', width: 120 },
    { key: 'cause', title: 'Cause', width: 180 },
    { key: 'date', title: 'Recorded On', width: 210 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

  // Confirms and soft-deletes a mortality record when the role allows it.
  const handleDelete = mortalityId => {
    if (!canDeleteMortality) {
      Alert.alert('Access denied', 'Only owner and worker users can delete mortality records.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this mortality record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteMortalityRecord(mortalityId); loadRecords(); } },
      ]
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mortality Records</Text>
      <Text style={styles.summary}>Total Dead: {totalDead}</Text>
      {/* Opens the mortality entry screen for this batch. */}
      <View style={styles.actions}>
        <ButtonLink title="Record Mortality" onPress={() => navigation.navigate('Mortality', { batchId, userId })} />
      </View>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        placeholder="Search by number dead, cause, or date"
        placeholderTextColor="#64748b"
      />
      {/* Displays mortality records in a reusable table. */}
      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={filteredRecords}
          keyExtractor={(item, index) => (item.mortality_id || index).toString()}
          emptyText={searchQuery.trim() ? 'No mortality records match your search.' : 'No mortality records yet'}
          renderCell={(item, column) => {
            if (column.key === 'number_dead') return <Text style={styles.cellText}>{item.number_dead}</Text>;
            if (column.key === 'cause') return <Text style={styles.cellText}>{item.cause_of_death}</Text>;
            if (column.key === 'date') return <Text style={styles.cellText}>{item.date_recorded}</Text>;
            if (column.key === 'actions') {
              return canDeleteMortality ? (
                <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.mortality_id)}>
                  <Text style={styles.dangerActionText}>Delete</Text>
                </TouchableOpacity>
              ) : <Text style={styles.viewOnlyText}>View only</Text>;
            }
            return null;
          }}
        />
      </View>
    </ScreenBackground>
  );
}

// Renders a compact primary action button above the table.
const ButtonLink = ({ title, onPress }) => (
  <TouchableOpacity style={styles.primaryAction} onPress={onPress}>
    <Text style={styles.primaryActionText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Mortality records table, action, and cell styles.
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  summary: { marginBottom: 12, fontWeight: '700', color: '#fff' },
  actions: { marginBottom: 14 },
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
  tableWrapper: { marginTop: 8 },
  cellText: { color: '#334155' },
  primaryAction: { backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start' },
  primaryActionText: { color: '#fff', fontWeight: '600' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
  viewOnlyText: { color: '#64748b', fontStyle: 'italic' },
});
