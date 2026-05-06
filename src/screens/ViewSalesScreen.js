import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteSaleRecord, getBatchById, getMortalityRecordsByBatchId, getSalesByBatchId, getUserById } from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

// Shows sales records, revenue totals, and remaining birds for one batch.
export default function ViewSalesScreen({ route, navigation }) {
  // Stores route ids, loaded sales rows, current user role, and available bird count.
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [availableBirds, setAvailableBirds] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Loads sales plus mortality and batch data so remaining birds can be calculated.
  const loadSalesState = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      setAvailableBirds(0);
      return;
    }

    getBatchById(batchId, batch => {
      if (!batch) {
        setRecords([]);
        setAvailableBirds(0);
        return;
      }

      getMortalityRecordsByBatchId(batchId, mortalityRecords => {
        getSalesByBatchId(batchId, salesRecords => {
          const safeSalesRecords = salesRecords || [];
          const initialChicks = Number(batch.initial_chicks || 0);
          const totalMortality = (mortalityRecords || []).reduce((sum, item) => sum + Number(item.number_dead || 0), 0);
          const totalBirdsSold = safeSalesRecords.reduce((sum, item) => sum + Number(item.birds_sold || 0), 0);
          setRecords(safeSalesRecords);
          setAvailableBirds(Math.max(initialChicks - totalMortality - totalBirdsSold, 0));
        });
      });
    });
  }, [batchId]);

  // Reloads the current role and sales state whenever the screen receives focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => setCurrentUser(user));
      } else {
        setCurrentUser(null);
      }

      loadSalesState();
    }, [loadSalesState, userId])
  );

  // Computes summary values and table columns for the sales list.
  const canDeleteSales = ['owner', 'manager'].includes(currentUser?.role);
  const totalRevenue = records.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);
  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return records;
    }

    return records.filter(item =>
      [item.birds_sold, item.price_per_bird, item.total_revenue, item.sale_date]
        .filter(value => value !== null && value !== undefined)
        .some(value => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [records, searchQuery]);
  const columns = [
    { key: 'birds_sold', title: 'Birds Sold', width: 110 },
    { key: 'price_per_bird', title: 'Price/Bird', width: 120 },
    { key: 'total_revenue', title: 'Revenue', width: 120 },
    { key: 'sale_date', title: 'Sold On', width: 180 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

  // Confirms and soft-deletes a sale record when the role allows it.
  const handleDelete = saleId => {
    if (!canDeleteSales) {
      Alert.alert('Access denied', 'Only owner and manager users can delete sales records.');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this sales record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteSaleRecord(saleId); loadSalesState(); } },
      ]
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sales Records</Text>
      <Text style={styles.summary}>Birds Available for Sale: {availableBirds}</Text>
      <Text style={styles.summary}>Total Revenue: {totalRevenue}</Text>
      {/* Opens the sales entry screen for this batch. */}
      <View style={styles.actions}>
        <ButtonLink title="Record Sales" onPress={() => navigation.navigate('Sales', { batchId, userId })} />
      </View>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        placeholder="Search by birds sold, price, revenue, or date"
        placeholderTextColor="#64748b"
      />
      {/* Displays sales records in a reusable table. */}
      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={filteredRecords}
          keyExtractor={(item, index) => (item.sale_id || index).toString()}
          emptyText={searchQuery.trim() ? 'No sales records match your search.' : 'No sales records yet'}
          renderCell={(item, column) => {
            if (column.key === 'birds_sold') return <Text style={styles.cellText}>{item.birds_sold}</Text>;
            if (column.key === 'price_per_bird') return <Text style={styles.cellText}>{item.price_per_bird}</Text>;
            if (column.key === 'total_revenue') return <Text style={styles.cellText}>{item.total_revenue}</Text>;
            if (column.key === 'sale_date') return <Text style={styles.cellText}>{item.sale_date}</Text>;
            if (column.key === 'actions') {
              return canDeleteSales ? (
                <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.sale_id)}>
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
  // Sales records table, action, and cell styles.
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
