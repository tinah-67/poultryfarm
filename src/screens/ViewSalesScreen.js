import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  deleteSaleRecord,
  getBatchById,
  getEggAvailabilityByBatchId,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
} from '../database/db';
import DataTable from '../components/DataTable';
import ScreenBackground from '../components/ScreenBackground';

// Shows sales records, revenue totals, and remaining birds for one batch.
export default function ViewSalesScreen({ route, navigation }) {
  // Stores route ids, loaded sales rows, current user role, and available bird count.
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [records, setRecords] = useState([]);
  const [saleType, setSaleType] = useState('birds');
  const [currentUser, setCurrentUser] = useState(null);
  const [availableBirds, setAvailableBirds] = useState(0);
  const [availableEggs, setAvailableEggs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Loads sales plus mortality and batch data so remaining birds can be calculated.
  const loadSalesState = useCallback(() => {
    if (!batchId) {
      setRecords([]);
      setAvailableBirds(0);
      setAvailableEggs(0);
      return;
    }

    getBatchById(batchId, batch => {
      if (!batch) {
        setRecords([]);
        setAvailableBirds(0);
        setAvailableEggs(0);
        return;
      }

      getEggAvailabilityByBatchId(batchId, setAvailableEggs);
      getMortalityRecordsByBatchId(batchId, mortalityRecords => {
        getSalesByBatchId(batchId, salesRecords => {
          const safeSalesRecords = salesRecords || [];
          const initialChicks = Number(batch.initial_chicks || 0);
          const totalMortality = (mortalityRecords || []).reduce((sum, item) => sum + Number(item.number_dead || 0), 0);
          const totalBirdsSold = safeSalesRecords.reduce((sum, item) => item.sale_type === 'eggs'
            ? sum
            : sum + Number(item.quantity_sold || 0), 0);
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
  const selectedRecords = records.filter(item => (item.sale_type || 'birds') === saleType);
  const totalRevenue = selectedRecords.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);
  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return selectedRecords;
    }

    return selectedRecords.filter(item =>
      [item.quantity_sold, item.unit_price, item.total_revenue, item.sale_date]
        .filter(value => value !== null && value !== undefined)
        .some(value => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [selectedRecords, searchQuery]);
  const columns = [
    { key: 'quantity_sold', title: `${saleType === 'eggs' ? 'Eggs' : 'Birds'} Sold`, width: 110 },
    { key: 'unit_price', title: `Price/${saleType === 'eggs' ? 'Egg' : 'Bird'}`, width: 120 },
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
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSaleRecord(saleId);
            loadSalesState();
          },
        },
      ]
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sales Records</Text>
      <View style={styles.saleTypeControl}>
        {[
          { key: 'birds', label: 'Bird Sales' },
          { key: 'eggs', label: 'Egg Sales' },
        ].map(option => (
          <TouchableOpacity
            key={option.key}
            style={[styles.saleTypeButton, saleType === option.key && styles.saleTypeButtonSelected]}
            onPress={() => {
              setSaleType(option.key);
              setSearchQuery('');
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: saleType === option.key }}
          >
            <Text style={[styles.saleTypeText, saleType === option.key && styles.saleTypeTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.summary}>
        {saleType === 'eggs' ? 'Eggs' : 'Birds'} Available for Sale: {saleType === 'eggs' ? availableEggs : availableBirds}
      </Text>
      <Text style={styles.summary}>Total Revenue: {totalRevenue}</Text>
      {/* Opens the sales entry screen for this batch. */}
      <View style={styles.actions}>
        <ButtonLink title="Record Sales" onPress={() => navigation.navigate('Sales', { batchId, userId })} />
      </View>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
        placeholder={`Search by ${saleType === 'eggs' ? 'eggs' : 'birds'} sold, price, revenue, or date`}
        placeholderTextColor="#64748b"
      />
      {/* Displays sales records in a reusable table. */}
      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={filteredRecords}
          keyExtractor={(item, index) => String(item.sale_id || index)}
          emptyText={searchQuery.trim() ? `No ${saleType} sales match your search.` : `No ${saleType} sales records yet`}
          renderCell={(item, column) => {
            if (column.key === 'quantity_sold') return <Text style={styles.cellText}>{item.quantity_sold}</Text>;
            if (column.key === 'unit_price') return <Text style={styles.cellText}>{item.unit_price}</Text>;
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
  saleTypeControl: { flexDirection: 'row', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  saleTypeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#fff' },
  saleTypeButtonSelected: { backgroundColor: '#166534' },
  saleTypeText: { color: '#0f172a', fontWeight: '600' },
  saleTypeTextSelected: { color: '#fff' },
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
