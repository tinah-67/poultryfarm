import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addExpenseRecord, getBatchById, getUserById } from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

// Lets owner and manager users record farm-level or batch-level expenses.
export default function ExpenseScreen({ route, navigation }) {
  // Defines dropdown options for expense categories and inventory purchase types.
  const feedTypeOptions = ['starter', 'grower', 'finisher'];
  const vaccineOptions = [
    'Newcastle disease',
    'Gumboro / IBD',
    'Infectious bronchitis',
    'Marek’s disease',
    'Coccidiosis',
  ];
  const farmExpenseTypeOptions = [
    'Feed purchase',
    'Vaccines purchase',
    'Veterinary services',
    'Litter',
    'Heating',
    'Labor',
    'Transport',
  ];

  // Stores route target, expense fields, dropdown state, current user, and batch status.
  const batchId = route?.params?.batchId;
  const farmId = route?.params?.farmId;
  const farmName = route?.params?.farmName;
  const userId = route?.params?.userId;
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('Feed purchase');
  const [showExpenseTypeDropdown, setShowExpenseTypeDropdown] = useState(false);
  const [feedType, setFeedType] = useState('');
  const [showFeedTypeDropdown, setShowFeedTypeDropdown] = useState(false);
  const [vaccineType, setVaccineType] = useState('Newcastle disease');
  const [showVaccineTypeDropdown, setShowVaccineTypeDropdown] = useState(false);
  const [quantityBought, setQuantityBought] = useState('');
  const [vaccineQuantity, setVaccineQuantity] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [batch, setBatch] = useState(null);

  // Reloads role and batch status whenever the expense screen receives focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        getUserById(userId, user => {
          setCurrentUser(user);
        });
      } else {
        setCurrentUser(null);
      }

      if (batchId) {
        getBatchById(batchId, batchRecord => {
          setBatch(batchRecord);
        });
      } else {
        setBatch(null);
      }
    }, [batchId, userId])
  );

  const canRecordExpense = ['owner', 'manager'].includes(currentUser?.role);
  const isFarmExpense = farmId != null && !batchId;
  const isFeedPurchase = isFarmExpense && expenseType === 'Feed purchase';
  const isVaccinePurchase = isFarmExpense && expenseType === 'Vaccines purchase';
  const isBatchCompleted = !isFarmExpense && String(batch?.status || 'active').toLowerCase() === 'completed';
  const title = isFarmExpense ? 'Record Farm Expense' : 'Record Batch Expense';
  const helperText = isFarmExpense
    ? `This will be saved as a shared farm bill${farmName ? ` for ${farmName}` : ''}.`
    : 'This will be saved as a batch-specific expense.';
  const amountValue = Number(amount);
  const quantityBoughtValue = Number(quantityBought);
  const vaccineQuantityValue = Number(vaccineQuantity);

  // Builds a useful default description for structured farm expenses.
  const buildFarmExpenseDescription = () => {
    if (description.trim()) {
      return description.trim();
    }

    if (isFeedPurchase) {
      return feedType
        ? `${feedType.charAt(0).toUpperCase() + feedType.slice(1)} feed purchase`
        : 'Feed purchase';
    }

    if (isVaccinePurchase) {
      return `${vaccineType} purchase${vaccineQuantity ? ` - ${vaccineQuantity} dose(s)` : ''}`;
    }

    return expenseType;
  };

  // Validates permissions, target, amount, and purchase details before saving.
  const handleAdd = () => {
    if (!canRecordExpense) {
      Alert.alert('Access denied', 'Only owner and manager users can record expenses.');
      return;
    }

    if (isBatchCompleted) {
      Alert.alert('Batch completed', 'Expense entries are disabled for completed batches. You can still view past expense records.');
      return;
    }

    if (!batchId && !farmId) {
      Alert.alert('Error', 'Expense target not found');
      return;
    }

    if ((!description.trim() && !isFarmExpense) || !amount) {
      Alert.alert('Error', 'Enter description and amount');
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Amount must be a valid number greater than 0');
      return;
    }

    if (isFarmExpense && isFeedPurchase) {
      if (!feedType) {
        Alert.alert('Error', 'Choose the feed type for this farm feed purchase');
        return;
      }

      if (!Number.isFinite(quantityBoughtValue) || quantityBoughtValue <= 0) {
        Alert.alert('Error', 'Quantity bought must be a valid number greater than 0');
        return;
      }
    }

    if (isFarmExpense && isVaccinePurchase && !vaccineType) {
      Alert.alert('Error', 'Choose the vaccine for this farm vaccine purchase');
      return;
    }

    if (isFarmExpense && isVaccinePurchase) {
      if (!Number.isFinite(vaccineQuantityValue) || vaccineQuantityValue <= 0) {
        Alert.alert('Error', 'Quantity bought must be a valid number greater than 0');
        return;
      }
    }

    addExpenseRecord(
      {
        farm_id: farmId ?? null,
        batch_id: batchId ?? null,
        description: isFarmExpense
          ? buildFarmExpenseDescription()
          : description.trim(),
        amount: amountValue,
        expense_date: new Date().toISOString(),
        expense_scope: isFarmExpense ? 'farm' : 'batch',
        feed_type: isFarmExpense && isFeedPurchase ? feedType : null,
        vaccine_name: isFarmExpense && isVaccinePurchase ? vaccineType : null,
        quantity_bought: isFarmExpense && isFeedPurchase
          ? quantityBoughtValue
          : isFarmExpense && isVaccinePurchase
            ? vaccineQuantityValue
            : null,
      },
      () => {
        setDescription('');
        setAmount('');
        setExpenseType('Feed purchase');
        setShowExpenseTypeDropdown(false);
        setFeedType('');
        setShowFeedTypeDropdown(false);
        setVaccineType('Newcastle disease');
        setShowVaccineTypeDropdown(false);
        setQuantityBought('');
        setVaccineQuantity('');
        Alert.alert('Success', `${isFarmExpense ? 'Farm' : 'Batch'} expense recorded`);
      }
    );
  };

  return (
    <ScreenBackground contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.noteText}>{helperText}</Text>
      {/* Farm expenses choose a category before showing category-specific fields. */}
      {isFarmExpense ? (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            activeOpacity={0.8}
            onPress={() => {
              setShowExpenseTypeDropdown(previous => !previous);
              setShowFeedTypeDropdown(false);
              setShowVaccineTypeDropdown(false);
            }}
          >
            <Text style={styles.dropdownTriggerText}>{expenseType}</Text>
            <Text style={styles.dropdownChevron}>{showExpenseTypeDropdown ? '^' : 'v'}</Text>
          </TouchableOpacity>

          {showExpenseTypeDropdown ? (
            <View style={styles.dropdownMenu}>
              {farmExpenseTypeOptions.map(option => {
                const isSelected = option === expenseType;

                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setExpenseType(option);
                      setShowExpenseTypeDropdown(false);
                      if (option !== 'Feed purchase') {
                        setShowFeedTypeDropdown(false);
                        setFeedType('');
                        setQuantityBought('');
                      }
                      if (option !== 'Vaccines purchase') {
                        setShowVaccineTypeDropdown(false);
                        setVaccineType('Newcastle disease');
                        setVaccineQuantity('');
                      }
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
      {isBatchCompleted ? (
        <Text style={styles.lockedNote}>
          This batch is completed. New expense entries are disabled, but you can still view the existing records.
        </Text>
      ) : null}
      {/* Shows expense entry controls only when recording is allowed. */}
      {canRecordExpense && !isBatchCompleted ? (
        <>
          {isFarmExpense && isFeedPurchase ? (
            <>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  activeOpacity={0.8}
                  onPress={() => setShowFeedTypeDropdown(previous => !previous)}
                >
                  <Text style={[styles.dropdownTriggerText, !feedType ? styles.dropdownPlaceholderText : null]}>
                    {feedType
                      ? `${feedType.charAt(0).toUpperCase() + feedType.slice(1)}`
                      : 'Select feed type'}
                  </Text>
                  <Text style={styles.dropdownChevron}>{showFeedTypeDropdown ? '^' : 'v'}</Text>
                </TouchableOpacity>

                {showFeedTypeDropdown ? (
                  <View style={styles.dropdownMenu}>
                    {feedTypeOptions.map(option => {
                      const isSelected = option === feedType;

                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setFeedType(option);
                            setShowFeedTypeDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <TextInput
                placeholder="Quantity bought (kg)"
                placeholderTextColor="#666"
                value={quantityBought}
                onChangeText={setQuantityBought}
                keyboardType="numeric"
                style={styles.input}
              />
            </>
          ) : null}
          {isFarmExpense && isVaccinePurchase ? (
            <>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowVaccineTypeDropdown(previous => !previous);
                    setShowFeedTypeDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownTriggerText}>{vaccineType}</Text>
                  <Text style={styles.dropdownChevron}>{showVaccineTypeDropdown ? '^' : 'v'}</Text>
                </TouchableOpacity>

                {showVaccineTypeDropdown ? (
                  <View style={styles.dropdownMenu}>
                    {vaccineOptions.map(option => {
                      const isSelected = option === vaccineType;

                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                          activeOpacity={0.8}
                          onPress={() => {
                            setVaccineType(option);
                            setShowVaccineTypeDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
              <TextInput
                placeholder="Quantity bought (doses)"
                placeholderTextColor="#666"
                value={vaccineQuantity}
                onChangeText={setVaccineQuantity}
                keyboardType="numeric"
                style={styles.input}
              />
            </>
          ) : null}
          {isFarmExpense && !isFeedPurchase && !isVaccinePurchase ? (
            <TextInput
              placeholder="Description"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />
          ) : null}
          {isFarmExpense ? null : (
            <TextInput
              placeholder="Description"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />
          )}
          <TextInput
            placeholder="Amount"
            placeholderTextColor="#666"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button title="Add Expense" onPress={handleAdd} />
        </>
      ) : isBatchCompleted ? null : (
        <Text style={styles.noteText}>You can review expense records, but only owners and managers can add expense entries.</Text>
      )}

      {/* Opens existing expense records for the selected farm or batch. */}
      <View style={styles.actions}>
        <Button title="View Expense Records" onPress={() => navigation.navigate('ViewExpenses', { batchId, farmId, farmName, userId })} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Expense form, dropdown, locked-state, and action styles.
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10, color: '#fff', fontWeight: '700' },
  lockedNote: { color: '#fecaca', marginBottom: 12 },
  noteText: { color: '#cbd5e1', marginBottom: 12 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#cbd5e1' },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownPlaceholderText: {
    color: '#64748b',
  },
  dropdownChevron: {
    color: '#475569',
    fontSize: 12,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  dropdownOptionText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
  },
  actions: { marginTop: 14 },
});
