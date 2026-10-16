import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addSaleRecord,
  getEggAvailabilityByBatchId,
  getBatchById,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
} from '../database/db';
import ScreenBackground from '../components/ScreenBackground';
import { formatBatchAge } from '../utils/batchAge';

// Lets owner and manager users record bird and egg sales for an active batch.
export default function SalesScreen({ route, navigation }) {
  // Stores route ids, sale fields, role data, available birds, and batch status.
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const routeSaleType = route?.params?.saleType;
  const [saleType, setSaleType] = useState(
    routeSaleType === 'eggs' || routeSaleType === 'birds' ? routeSaleType : null
  );
  const [eggSaleUnit, setEggSaleUnit] = useState('egg');
  const [quantitySold, setQuantitySold] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [availableBirds, setAvailableBirds] = useState(0);
  const [availableEggs, setAvailableEggs] = useState(0);
  const [batch, setBatch] = useState(null);

  // Calculates bird and egg inventory after previous records and sales.
  const loadSaleAvailability = useCallback((done) => {
    if (!batchId) {
      setAvailableBirds(0);
      setAvailableEggs(0);
      done && done();
      return;
    }

    getBatchById(batchId, batchRecord => {
      if (!batchRecord) {
        setBatch(null);
        setAvailableBirds(0);
        setAvailableEggs(0);
        done && done();
        return;
      }

      setBatch(batchRecord);
      getEggAvailabilityByBatchId(batchId, setAvailableEggs);

      getMortalityRecordsByBatchId(batchId, mortalityRecords => {
        getSalesByBatchId(batchId, salesRecords => {
          const initialChicks = Number(batchRecord.initial_chicks || 0);
          const totalMortality = (mortalityRecords || []).reduce(
            (sum, item) => sum + Number(item.number_dead || 0),
            0
          );
          const totalBirdsSold = (salesRecords || []).reduce(
            (sum, item) => item.sale_type === 'eggs'
              ? sum
              : sum + Number(item.quantity_sold || 0),
            0
          );

          setAvailableBirds(Math.max(initialChicks - totalMortality - totalBirdsSold, 0));
          done && done();
        });
      });
    });
  }, [batchId]);

  // Reloads role and available bird count whenever the screen receives focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }

      loadSaleAvailability();
    }, [loadSaleAvailability, userId])
  );

  const canRecordSales = ['owner', 'manager'].includes(currentUser?.role);
  const isBatchCompleted = String(batch?.status || 'active').toLowerCase() === 'completed';
  const batchAge = saleType === 'birds' ? formatBatchAge(batch?.start_date) : null;
  const saleUnitMultiplier = saleType === 'eggs' && eggSaleUnit === 'tray' ? 30 : 1;
  const quantityLabel = saleType === 'eggs'
    ? (eggSaleUnit === 'tray' ? 'Trays Sold' : 'Eggs Sold')
    : 'Birds Sold';
  const priceLabel = saleType === 'eggs'
    ? (eggSaleUnit === 'tray' ? 'Price Per Tray' : 'Price Per Egg')
    : 'Price Per Bird';

  // Validates permission, batch status, quantity, price, and available birds before saving.
  const handleAdd = () => {
    if (!canRecordSales) {
      Alert.alert('Access denied', 'Only owner and manager users can record sales.');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'Sales entries are disabled for completed batches. You can still view past sales records.');
      return;
    }

    if (!batchId) {
      Alert.alert('Error', 'Batch not found');
      return;
    }

    if (!saleType) {
      Alert.alert('Choose sale type', 'Select whether you are selling eggs or birds.');
      return;
    }

    if (!quantitySold || !pricePerUnit) {
      Alert.alert('Error', `Enter ${quantityLabel.toLowerCase()} and the ${priceLabel.toLowerCase()}.`);
      return;
    }

    if (!/^\d+$/.test(quantitySold.trim()) || Number(quantitySold) <= 0) {
      Alert.alert('Error', 'Quantity sold must be a positive whole number');
      return;
    }

    const priceValue = Number(pricePerUnit);

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      Alert.alert('Error', `${priceLabel} must be greater than 0.`);
      return;
    }

    const enteredQuantity = Number(quantitySold);
    const quantityToSell = enteredQuantity * saleUnitMultiplier;
    const availableQuantity = saleType === 'eggs' ? availableEggs : availableBirds;

    if (quantityToSell > availableQuantity) {
      const availableMessage = saleType === 'eggs' && eggSaleUnit === 'tray'
        ? `Only ${Math.floor(availableEggs / 30)} full trays (${availableEggs} eggs) are currently available.`
        : `Only ${availableQuantity} ${saleType} are currently available for sale in this batch.`;
      Alert.alert(`Not enough ${saleType}`, availableMessage);
      return;
    }

    const onSaved = () => {
      setQuantitySold('');
      setPricePerUnit('');
      loadSaleAvailability();
      const savedMessage = saleType === 'eggs' && eggSaleUnit === 'tray'
        ? `${enteredQuantity} ${enteredQuantity === 1 ? 'tray' : 'trays'} (${quantityToSell} eggs) recorded.`
        : `${saleType === 'eggs' ? 'Egg' : 'Bird'} sale recorded.`;
      Alert.alert('Success', savedMessage);
    };

    const pricePerStoredUnit = priceValue / saleUnitMultiplier;
    const totalRevenue = enteredQuantity * priceValue;
    addSaleRecord(
      batchId,
      saleType,
      quantityToSell,
      pricePerStoredUnit,
      new Date().toISOString(),
      onSaved,
      totalRevenue,
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>Record Sales</Text>
      {isBatchCompleted ? (
        <Text style={styles.lockedNote}>
          This batch is completed. New sales entries are disabled, but you can still view the existing records.
        </Text>
      ) : null}
      <View style={styles.saleTypeControl}>
        {[
          { key: 'birds', label: 'Birds' },
          { key: 'eggs', label: 'Eggs' },
        ].map(option => (
          <TouchableOpacity
            key={option.key}
            style={[styles.saleTypeButton, saleType === option.key && styles.saleTypeButtonSelected]}
            onPress={() => {
              setSaleType(option.key);
              setEggSaleUnit('egg');
              setQuantitySold('');
              setPricePerUnit('');
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
      {saleType ? (
        <Text style={styles.summary}>
          {saleType === 'eggs' ? 'Eggs' : 'Birds'} Available for Sale: {saleType === 'eggs' ? availableEggs : availableBirds}
        </Text>
      ) : null}
      {batchAge ? <Text style={styles.ageSummary}>Bird age today: {batchAge}</Text> : null}
      {saleType === 'eggs' ? (
        <View>
          <Text style={styles.unitLabel}>Sell eggs by</Text>
          <View style={styles.saleTypeControl}>
            {[
              { key: 'egg', label: 'Each Egg' },
              { key: 'tray', label: 'Tray (30 eggs)' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={[styles.saleTypeButton, eggSaleUnit === option.key && styles.saleTypeButtonSelected]}
                onPress={() => {
                  setEggSaleUnit(option.key);
                  setQuantitySold('');
                  setPricePerUnit('');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: eggSaleUnit === option.key }}
              >
                <Text style={[styles.saleTypeText, eggSaleUnit === option.key && styles.saleTypeTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {eggSaleUnit === 'tray' ? (
            <Text style={styles.noteText}>Up to {Math.floor(availableEggs / 30)} full trays available.</Text>
          ) : null}
        </View>
      ) : null}
      {/* Shows sale entry fields only when recording is allowed. */}
      {canRecordSales && !isBatchCompleted && saleType ? (
        <>
          <TextInput
            placeholder={quantityLabel}
            placeholderTextColor="#666"
            value={quantitySold}
            onChangeText={setQuantitySold}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            placeholder={priceLabel}
            placeholderTextColor="#666"
            value={pricePerUnit}
            onChangeText={setPricePerUnit}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {quantitySold && pricePerUnit && Number(quantitySold) > 0 && Number(pricePerUnit) > 0 ? (
            <Text style={styles.summary}>Sale Total: {(Number(quantitySold) * Number(pricePerUnit)).toFixed(2)}</Text>
          ) : null}
          <Button title="Add Sale" onPress={handleAdd} />
        </>
      ) : isBatchCompleted ? null : canRecordSales ? (
        <Text style={styles.noteText}>Choose Eggs or Birds to begin recording a sale.</Text>
      ) : (
        <Text style={styles.noteText}>You can review sales records, but only owners and managers can add sales entries.</Text>
      )}

      {/* Opens existing sales records for this batch. */}
      <View style={styles.actions}>
        <Button title="View Sales Records" onPress={() => navigation.navigate('ViewSales', { batchId, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Sales form, type selector, available inventory, and action styles.
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  lockedNote: { color: '#fecaca', marginBottom: 12 },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  ageSummary: { color: '#bbf7d0', fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  summary: { marginVertical: 10, fontWeight: 'bold', color: '#fff' },
  unitLabel: { color: '#fff', fontWeight: '700', marginBottom: 6 },
  saleTypeControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  saleTypeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#fff' },
  saleTypeButtonSelected: { backgroundColor: '#166534' },
  saleTypeText: { color: '#0f172a', fontWeight: '600' },
  saleTypeTextSelected: { color: '#fff' },
  actions: { marginTop: 14 },
});
