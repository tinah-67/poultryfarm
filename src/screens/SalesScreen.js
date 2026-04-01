import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addSaleRecord, getSalesByBatchId, deleteSaleRecord } from '../database/db';
import DataTable from '../components/DataTable';

export default function SalesScreen({ route }) {
  const batchId = route?.params?.batchId;
  const [birdsSold, setBirdsSold] = useState('');
  const [pricePerBird, setPricePerBird] = useState('');
  const [records, setRecords] = useState([]);

  const loadRecords = useCallback(() => {
    if (!batchId) {
      return;
    }

    getSalesByBatchId(batchId, setRecords);
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const handleAdd = () => {
    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!birdsSold || !pricePerBird) {
      Alert.alert('Error', 'Enter birds sold and price per bird');
      return;
    }

    addSaleRecord(
      batchId,
      Number(birdsSold),
      Number(pricePerBird),
      new Date().toISOString(),
      () => {
        setBirdsSold('');
        setPricePerBird('');
        loadRecords();
      }
    );
  };

  const handleDelete = (saleId) => {
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
            loadRecords();
          },
        },
      ]
    );
  };

  const totalRevenue = records.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);
  const columns = [
    { key: 'birds_sold', title: 'Birds Sold', width: 110 },
    { key: 'price_per_bird', title: 'Price/Bird', width: 120 },
    { key: 'total_revenue', title: 'Revenue', width: 120 },
    { key: 'sale_date', title: 'Sold On', width: 180 },
    { key: 'actions', title: 'Actions', width: 120 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sales Records</Text>
      <TextInput
        placeholder="Birds Sold"
        placeholderTextColor="#666"
        value={birdsSold}
        onChangeText={setBirdsSold}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Price Per Bird"
        placeholderTextColor="#666"
        value={pricePerBird}
        onChangeText={setPricePerBird}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Add Sale" onPress={handleAdd} />
      <Text style={styles.summary}>Total Revenue: {totalRevenue}</Text>

      <View style={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={records}
          keyExtractor={(item, index) => (item.sale_id || index).toString()}
          emptyText="No sales records yet"
          renderCell={(item, column) => {
            if (column.key === 'birds_sold') {
              return <Text style={styles.cellText}>{item.birds_sold}</Text>;
            }

            if (column.key === 'price_per_bird') {
              return <Text style={styles.cellText}>{item.price_per_bird}</Text>;
            }

            if (column.key === 'total_revenue') {
              return <Text style={styles.cellText}>{item.total_revenue}</Text>;
            }

            if (column.key === 'sale_date') {
              return <Text style={styles.cellText}>{item.sale_date}</Text>;
            }

            if (column.key === 'actions') {
              return (
                <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.sale_id)}>
                  <Text style={styles.dangerActionText}>Delete</Text>
                </TouchableOpacity>
              );
            }

            return null;
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f1f5f9' },
  title: { fontSize: 20, marginBottom: 10, color: '#0f172a', fontWeight: '700' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: '#fff', borderColor: '#cbd5e1' },
  summary: { marginVertical: 10, fontWeight: 'bold', color: '#0f172a' },
  tableWrapper: { marginTop: 8 },
  cellText: { color: '#334155' },
  dangerAction: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  dangerActionText: { color: '#b91c1c', fontWeight: '600' },
});
