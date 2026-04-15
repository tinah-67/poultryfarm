import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteVaccinationRecord, getUserById, getVaccinationRecordsByBatchId } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

export default function ViewVaccinationsScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      return;
    }

    getVaccinationRecordsByBatchId(batchId, setRecords);
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

  const canDeleteVaccination = ['owner', 'worker'].includes(currentUser?.role);
  const canRecordVaccination = ['owner', 'worker'].includes(currentUser?.role);
  const hasNextDueDate = value => String(value || '').trim().length > 0;
  const isDueCompleted = value => String(value || '').trim().length > 0;
  const columns = [
    { key: 'vaccine_name', title: 'Vaccine', width: 170 },
    { key: 'vaccination_date', title: 'Date Given', width: 140 },
    { key: 'next_due_date', title: 'Next Due', width: 140 },
    { key: 'due_status', title: 'Due Status', width: 130 },
    { key: 'notes', title: 'Notes', width: 200 },
    { key: 'actions', title: 'Actions', width: 170 },
  ];

  const handleDelete = vaccinationId => {
    if (!canDeleteVaccination) {
      Alert.alert('Access denied', 'Only owner and worker users can delete vaccination records.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this vaccination record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteVaccinationRecord(vaccinationId); loadRecords(); } },
      ]
    );
  };

  const handleRecordFollowUp = record => {
    if (!canRecordVaccination) {
      Alert.alert('Access denied', 'Only owner and worker users can record vaccinations.');
      return;
    }

    navigation.navigate('Vaccination', {
      batchId,
      userId,
      prefilledVaccineName: record.vaccine_name,
      prefilledDueDate: record.next_due_date,
      sourceVaccinationId: record.vaccination_id,
    });
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vaccination Records</Text>
      <View style={styles.actions}>
        <ButtonLink title="Record Vaccination" onPress={() => navigation.navigate('Vaccination', { batchId, userId })} />
      </View>
      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(item, index) => (item.vaccination_id || index).toString()}
          emptyText="No vaccination records yet"
          renderCell={(item, column) => {
            const showFollowUpAction = hasNextDueDate(item.next_due_date) && !isDueCompleted(item.due_completed_at);

            if (column.key === 'vaccine_name') return <Text style={styles.cellText}>{item.vaccine_name}</Text>;
            if (column.key === 'vaccination_date') return <Text style={styles.cellText}>{item.vaccination_date}</Text>;
            if (column.key === 'next_due_date') return <Text style={styles.cellText}>{showFollowUpAction ? item.next_due_date : 'N/A'}</Text>;
            if (column.key === 'due_status') {
              if (!hasNextDueDate(item.next_due_date)) {
                return <Text style={styles.cellText}>No follow-up</Text>;
              }

              return (
                <Text style={isDueCompleted(item.due_completed_at) ? styles.completedText : styles.pendingText}>
                  {isDueCompleted(item.due_completed_at) ? 'Completed' : 'Pending'}
                </Text>
              );
            }
            if (column.key === 'notes') return <Text style={styles.cellText}>{item.notes || 'N/A'}</Text>;
            if (column.key === 'actions') {
              return (
                <View style={styles.rowActions}>
                  {showFollowUpAction ? (
                    <TouchableOpacity style={styles.primaryActionSmall} onPress={() => handleRecordFollowUp(item)}>
                      <Text style={styles.primaryActionSmallText}>Follow Up</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canDeleteVaccination ? (
                    <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.vaccination_id)}>
                      <Text style={styles.dangerActionText}>Delete</Text>
                    </TouchableOpacity>
                  ) : !showFollowUpAction ? <Text style={styles.viewOnlyText}>View only</Text> : null}
                </View>
              );
            }
            return null;
          }}
        />
      </View>
    </ScreenBackground>
  );
}

const ButtonLink = ({ title, onPress }) => (
  <TouchableOpacity style={styles.primaryAction} onPress={onPress}>
    <Text style={styles.primaryActionText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  actions: { marginBottom: 14 },
  tableWrapper: { marginTop: 8 },
  rowActions: { gap: 8 },
  cellText: { color: '#334155' },
  primaryAction: { backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start' },
  primaryActionText: { color: '#fff', fontWeight: '600' },
  primaryActionSmall: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  primaryActionSmallText: { color: '#1d4ed8', fontWeight: '600' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
  pendingText: { color: '#92400e', fontWeight: '600' },
  completedText: { color: '#166534', fontWeight: '600' },
  viewOnlyText: { color: '#64748b', fontStyle: 'italic' },
});
