import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteEggBreakageRecord, getEggBreakageRecordsByBatchId, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

// Shows eggs broken after their collection record was saved.
export default function ViewEggBreakageScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      return;
    }

    getEggBreakageRecordsByBatchId(batchId, data => setRecords(data || []));
  }, [batchId]);

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

  const canDelete = ['owner', 'worker'].includes(currentUser?.role);
  const columns = [
    { key: 'date', title: 'Breakage Date', width: 150 },
    { key: 'broken', title: 'Eggs Broken', width: 110 },
    { key: 'actions', title: 'Actions', width: 100 },
  ];

  const handleDelete = id => {
    if (!canDelete) {
      Alert.alert('Access denied', 'Only owners and workers can delete egg breakage records.');
      return;
    }

    Alert.alert('Delete breakage record', 'Delete this post-collection breakage record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEggBreakageRecord(id);
          loadRecords();
        },
      },
    ]);
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Later Breakage History</Text>
      <TouchableOpacity
        style={styles.primaryAction}
        onPress={() => navigation.navigate('RecordEggBreakage', { batchId, userId })}
      >
        <Text style={styles.primaryActionText}>Record Egg Breakage</Text>
      </TouchableOpacity>
      <DataTable
        columns={columns}
        data={records}
        keyExtractor={(item, index) => String(item.egg_breakage_id || index)}
        emptyText="No post-collection breakage recorded."
        renderCell={(item, column) => {
          if (column.key === 'date') return <Text style={styles.cellText}>{item.breakage_date}</Text>;
          if (column.key === 'broken') return <Text style={styles.cellText}>{item.eggs_broken}</Text>;
          if (column.key === 'actions') {
            return canDelete ? (
              <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(item.egg_breakage_id)}>
                <Text style={styles.deleteActionText}>Delete</Text>
              </TouchableOpacity>
            ) : <Text style={styles.viewOnly}>View only</Text>;
          }
          return null;
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  cellText: { color: '#334155' },
  primaryAction: { backgroundColor: '#166534', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6, alignSelf: 'flex-start' },
  primaryActionText: { color: '#fff', fontWeight: '600' },
  deleteAction: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 5 },
  deleteActionText: { color: '#b91c1c', fontWeight: '600' },
  viewOnly: { color: '#64748b', fontStyle: 'italic' },
});