import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addSaleRecord, getSalesByBatchId, deleteSaleRecord } from '../database/db';

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
    deleteSaleRecord(saleId);
    loadRecords();
  };

  const totalRevenue = records.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);

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

      <FlatList
        data={records}
        keyExtractor={(item, index) => (item.sale_id || index).toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>Birds Sold: {item.birds_sold}</Text>
            <Text>Price/Bird: {item.price_per_bird}</Text>
            <Text>Total Revenue: {item.total_revenue}</Text>
            <Text>Date: {item.sale_date}</Text>
            <Button title="Delete" onPress={() => handleDelete(item.sale_id)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No sales records yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  summary: { marginVertical: 10, fontWeight: 'bold' },
  card: { padding: 10, borderWidth: 1, marginVertical: 5, borderRadius: 5 },
  emptyText: { textAlign: 'center', marginTop: 20 },
});
