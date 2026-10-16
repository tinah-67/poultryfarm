import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteEggCollectionRecord, getEggCollectionsByBatchId, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

// Shows weekly egg collection records for one batch.
export default function ViewEggCollectionsScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      return;
    }

    getEggCollectionsByBatchId(batchId, data => setRecords(data || []));
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
    { key: 'date', title: 'Collection Date', width: 150 },
    { key: 'collected', title: 'Collected', width: 110 },
    { key: 'broken', title: 'Broken at Collection', width: 150 },
    { key: 'actions', title: 'Actions', width: 100 },
  ];

  const handleDelete = id => {
    if (!canDelete) {
      Alert.alert('Access denied', 'Only owners and workers can delete egg collection records.');
      return;
    }

    Alert.alert('Delete egg collection', 'Delete this collection record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEggCollectionRecord(id);
          loadRecords();
        },
      },
    ]);
  };

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Collection History</Text>
      <TouchableOpacity
        style={styles.primaryAction}
        onPress={() => navigation.navigate('RecordEggCollection', { batchId, userId })}
      >
        <Text style={styles.primaryActionText}>Record Egg Collection</Text>
      </TouchableOpacity>
      <DataTable
        columns={columns}
        data={records}
        keyExtractor={(item, index) => String(item.egg_collection_id || index)}
        emptyText="No egg collections recorded for this flock yet."
        renderCell={(item, column) => {
          if (column.key === 'date') return <Text style={styles.cellText}>{item.collection_date}</Text>;
          if (column.key === 'collected') return <Text style={styles.cellText}>{item.eggs_collected}</Text>;
          if (column.key === 'broken') return <Text style={styles.cellText}>{item.eggs_broken}</Text>;
          if (column.key === 'actions') {
            return canDelete ? (
              <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(item.egg_collection_id)}>
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