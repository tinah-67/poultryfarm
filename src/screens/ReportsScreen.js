import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import DataTable from '../components/DataTable';
import { exportReportToExcel } from '../services/reportExport';
import {
  getAccessibleFarms,
  getBatchesByFarmId,
  getExpensesByFarmId,
  getExpensesByBatchId,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
  getVaccinationRecordsByBatchId,
} from '../database/db';

// Loads the optional native date picker when the dependency is available.
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (error) {
  DateTimePicker = null;
}

// Defines report types and the limited set available to worker users.
const REPORT_TYPES = ['batches', 'sales', 'expenses', 'feed', 'mortality', 'vaccinations'];
const WORKER_REPORT_TYPES = ['feed', 'mortality', 'vaccinations'];
const ZERO_DEFAULT_KEYS = ['birds_alive', 'birds_sold', 'total_mortality', 'number_dead'];

// Formats report numeric values with a fixed number of decimals.
const formatNumber = (value, digits = 2) => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return 'N/A';
  }

  return numericValue.toFixed(digits);
};

// Formats currency values for summaries, tables, and exports.
const formatCurrency = value => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return '0.00';
  }

  return numericValue.toFixed(2);
};

// Normalizes feed types so purchases and usage can be matched.
const normalizeFeedType = value => String(value || '').trim().toLowerCase();

// Adds remaining-feed values to feed usage records from farm purchase totals.
const buildFeedRecordsWithRemaining = (feedRecords, expenseRecords) => {
  const purchaseTotals = new Map();

  expenseRecords.forEach(record => {
    const isFarmFeedPurchase = (record.expense_scope_label === 'Farm' || record.expense_scope === 'farm')
      && normalizeFeedType(record.feed_type)
      && Number(record.quantity_bought || 0) > 0;

    if (!isFarmFeedPurchase) {
      return;
    }

    const key = `${record.farm_id}:${normalizeFeedType(record.feed_type)}`;
    const runningTotal = purchaseTotals.get(key) || 0;
    purchaseTotals.set(key, runningTotal + Number(record.quantity_bought || 0));
  });

  const usageByFeedId = new Map();
  const cumulativeUsage = new Map();

  [...feedRecords]
    .sort((left, right) => {
      const dateCompare = String(left.date_recorded || '').localeCompare(String(right.date_recorded || ''));

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return Number(left.feed_id || 0) - Number(right.feed_id || 0);
    })
    .forEach(record => {
      const key = `${record.farm_id}:${normalizeFeedType(record.feed_type)}`;
      const nextUsedQuantity = (cumulativeUsage.get(key) || 0) + Number(record.feed_quantity || 0);
      cumulativeUsage.set(key, nextUsedQuantity);
      usageByFeedId.set(
        record.feed_id,
        Math.max((purchaseTotals.get(key) || 0) - nextUsedQuantity, 0)
      );
    });

  return feedRecords.map(record => ({
    ...record,
    remaining_feed: usageByFeedId.has(record.feed_id)
      ? usageByFeedId.get(record.feed_id)
      : Math.max((purchaseTotals.get(`${record.farm_id}:${normalizeFeedType(record.feed_type)}`) || 0) - Number(record.feed_quantity || 0), 0),
  }));
};

// Builds the latest remaining-feed totals per feed type for summary cards.
const getFeedSummaryRemainingByType = feedRecords => {
  const latestByFarmAndType = new Map();

  feedRecords.forEach(record => {
    const key = `${record.farm_id}:${normalizeFeedType(record.feed_type)}`;
    const currentRecord = latestByFarmAndType.get(key);
    const recordKey = `${record.date_recorded || ''}|${String(record.feed_id || 0).padStart(12, '0')}`;
    const currentKey = currentRecord
      ? `${currentRecord.date_recorded || ''}|${String(currentRecord.feed_id || 0).padStart(12, '0')}`
      : '';

    if (!currentRecord || recordKey > currentKey) {
      latestByFarmAndType.set(key, record);
    }
  });

  return Array.from(latestByFarmAndType.values()).reduce((totals, record) => {
    const feedType = normalizeFeedType(record.feed_type);
    const remainingAmount = Number(record.remaining_feed || 0);

    if (!feedType) {
      return totals;
    }

    return {
      ...totals,
      [feedType]: Number(totals[feedType] || 0) + remainingAmount,
    };
  }, {});
};

// Provides the empty report data shape used before records are loaded.
const createEmptyData = () => ({
  farms: [],
  batches: [],
  sales: [],
  expenses: [],
  feed: [],
  mortality: [],
  vaccinations: [],
});

// Formats a local date as YYYY-MM-DD.
const formatDateValue = date => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

// Returns today's local date at midnight for date-range validation.
const getTodayDate = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

// Parses report date values into comparable local dates.
const parseComparableDate = value => {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return null;
  }

  const directDate = new Date(rawValue);
  if (!Number.isNaN(directDate.getTime())) {
    return new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate());
  }

  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

// Checks whether a row date falls inside the selected period filter.
const isWithinDateRange = (value, startDate, endDate) => {
  if (!startDate && !endDate) {
    return true;
  }

  const itemDate = parseComparableDate(value);

  if (!itemDate) {
    return false;
  }

  if (startDate && itemDate < startDate) {
    return false;
  }

  if (endDate && itemDate > endDate) {
    return false;
  }

  return true;
};

// Counts distinct farms in a filtered report result.
const getUniqueFarmCount = items =>
  new Set(
    items
      .map(item => item.farm_name)
      .filter(Boolean)
  ).size;

// Renders one summary metric card for the active report.
const SummaryCard = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

// Builds filtered operational reports across farms, batches, and record types.
export default function ReportsScreen({ route }) {
  // Stores report data, filters, active report, export state, and dropdown state.
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [reportData, setReportData] = useState(createEmptyData());
  const [activeReport, setActiveReport] = useState('batches');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pickerField, setPickerField] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState('all');
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);

  // Loads the current user so reports can be restricted by role.
  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setCurrentUser(null);
        return undefined;
      }

      getUserById(userId, user => {
        setCurrentUser(user);
      });

      return undefined;
    }, [userId])
  );

  // Loads farms, batches, and all child records into one report data object.
  const loadReports = useCallback((done) => {
    if (!userId) {
      setReportData(createEmptyData());
      done && done();
      return;
    }

    getAccessibleFarms(userId, farms => {
      const safeFarms = farms || [];

      if (safeFarms.length === 0) {
        setReportData(createEmptyData());
        done && done();
        return;
      }

      const nextData = {
        farms: safeFarms,
        batches: [],
        sales: [],
        expenses: [],
        feed: [],
        mortality: [],
        vaccinations: [],
      };
      const totalFarmOperations = safeFarms.length * 2;
      let completedFarmOperations = 0;

      // Finalizes report data once each farm-level and batch-level load completes.
      const finalizeReportsLoad = () => {
        completedFarmOperations += 1;

        if (completedFarmOperations !== totalFarmOperations) {
          return;
        }

        const feedWithRemaining = buildFeedRecordsWithRemaining(nextData.feed, nextData.expenses);

        setReportData({
          ...nextData,
          batches: nextData.batches.sort((left, right) => String(right.start_date).localeCompare(String(left.start_date))),
          sales: nextData.sales.sort((left, right) => String(right.sale_date).localeCompare(String(left.sale_date))),
          expenses: nextData.expenses.sort((left, right) => String(right.expense_date).localeCompare(String(left.expense_date))),
          feed: feedWithRemaining.sort((left, right) => String(right.date_recorded).localeCompare(String(left.date_recorded))),
          mortality: nextData.mortality.sort((left, right) => String(right.date_recorded).localeCompare(String(left.date_recorded))),
          vaccinations: nextData.vaccinations.sort((left, right) => String(right.vaccination_date).localeCompare(String(left.vaccination_date))),
        });
        done && done();
      };

      safeFarms.forEach(farm => {
        getExpensesByFarmId(farm.farm_id, expenseRecords => {
          (expenseRecords || []).forEach(record => {
            nextData.expenses.push({
              ...record,
              farm_name: farm.farm_name,
              location: farm.location,
              breed: 'Farm-wide',
              batch_status: 'farm bill',
              batch_id: record.batch_id ?? 'Farm',
              expense_scope_label: 'Farm',
            });
          });

          finalizeReportsLoad();
        });

        getBatchesByFarmId(farm.farm_id, batches => {
          const safeBatches = batches || [];

          if (safeBatches.length === 0) {
            finalizeReportsLoad();
            return;
          }

          let processedBatches = 0;

          safeBatches.forEach(batch => {
            getFeedRecordsByBatchId(batch.batch_id, feedRecords => {
              getMortalityRecordsByBatchId(batch.batch_id, mortalityRecords => {
                getExpensesByBatchId(batch.batch_id, expenseRecords => {
                  getSalesByBatchId(batch.batch_id, saleRecords => {
                    getVaccinationRecordsByBatchId(batch.batch_id, vaccinationRecords => {
                      const safeFeedRecords = feedRecords || [];
                      const safeMortalityRecords = mortalityRecords || [];
                      const safeExpenseRecords = expenseRecords || [];
                      const safeSaleRecords = saleRecords || [];
                      const safeVaccinationRecords = vaccinationRecords || [];

                      const totalMortality = safeMortalityRecords.reduce(
                        (sum, item) => sum + Number(item.number_dead || 0),
                        0
                      );
                      const totalSold = safeSaleRecords.reduce(
                        (sum, item) => sum + Number(item.birds_sold || 0),
                        0
                      );
                      const totalFeedUsed = safeFeedRecords.reduce(
                        (sum, item) => sum + Number(item.feed_quantity || 0),
                        0
                      );
                      const totalExpenses = Number(batch.purchase_cost || 0)
                        + safeFeedRecords.reduce((sum, item) => sum + Number(item.feed_cost || 0), 0)
                        + safeExpenseRecords.reduce((sum, item) => sum + Number(item.amount || 0), 0);
                      const totalRevenue = safeSaleRecords.reduce(
                        (sum, item) => sum + Number(item.total_revenue || 0),
                        0
                      );
                      const initialChicks = Number(batch.initial_chicks || 0);
                      const birdsAlive = Math.max(initialChicks - totalMortality - totalSold, 0);

                      nextData.batches.push({
                        batch_id: batch.batch_id,
                        batch_name: batch.breed || `Batch ${batch.batch_id}`,
                        farm_id: farm.farm_id,
                        farm_name: farm.farm_name,
                        location: farm.location,
                        breed: batch.breed,
                        start_date: batch.start_date,
                        status: batch.status || 'active',
                        initial_chicks: initialChicks,
                        birds_alive: birdsAlive,
                        birds_sold: totalSold,
                        total_mortality: totalMortality,
                        feed_used: totalFeedUsed,
                        total_expenses: totalExpenses,
                        total_revenue: totalRevenue,
                      });

                      safeSaleRecords.forEach(record => {
                        nextData.sales.push({
                          ...record,
                          batch_name: batch.breed || `Batch ${batch.batch_id}`,
                          farm_id: farm.farm_id,
                          farm_name: farm.farm_name,
                          location: farm.location,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeExpenseRecords.forEach(record => {
                        nextData.expenses.push({
                          ...record,
                          batch_name: batch.breed || `Batch ${batch.batch_id}`,
                          farm_id: farm.farm_id,
                          farm_name: farm.farm_name,
                          location: farm.location,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                          expense_scope_label: 'Batch',
                        });
                      });

                      safeFeedRecords.forEach(record => {
                        nextData.feed.push({
                          ...record,
                          batch_name: batch.breed || `Batch ${batch.batch_id}`,
                          farm_id: farm.farm_id,
                          farm_name: farm.farm_name,
                          location: farm.location,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeMortalityRecords.forEach(record => {
                        nextData.mortality.push({
                          ...record,
                          batch_name: batch.breed || `Batch ${batch.batch_id}`,
                          farm_id: farm.farm_id,
                          farm_name: farm.farm_name,
                          location: farm.location,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeVaccinationRecords.forEach(record => {
                        nextData.vaccinations.push({
                          ...record,
                          batch_name: batch.breed || `Batch ${batch.batch_id}`,
                          farm_id: farm.farm_id,
                          farm_name: farm.farm_name,
                          location: farm.location,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      processedBatches += 1;

                      if (processedBatches === safeBatches.length) {
                        finalizeReportsLoad();
                      }
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }, [userId]);

  // Refreshes report data whenever the Reports screen receives focus.
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  // Limits worker users to operational reports they are allowed to see.
  const availableReportTypes = useMemo(() => (
    currentUser?.role === 'worker' ? WORKER_REPORT_TYPES : REPORT_TYPES
  ), [currentUser?.role]);

  // Switches away from a report type if the current role cannot view it.
  useEffect(() => {
    if (availableReportTypes.includes(activeReport)) {
      return;
    }

    setActiveReport(availableReportTypes[0] || 'feed');
  }, [activeReport, availableReportTypes]);

  // Handles pull-to-refresh for report data.
  const handleRefresh = () => {
    setRefreshing(true);
    loadReports(() => setRefreshing(false));
  };

  // Prepares date filter values for validation and row filtering.
  const parsedFromDate = useMemo(() => parseComparableDate(fromDate), [fromDate]);
  const parsedToDate = useMemo(() => parseComparableDate(toDate), [toDate]);
  const todayDate = useMemo(() => getTodayDate(), []);

  // Applies date picker changes while keeping the range valid.
  const handlePickerChange = (_, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setPickerField(null);
    }

    if (!selectedDate || !pickerField) {
      return;
    }

    const nextDateValue = formatDateValue(selectedDate);

    if (pickerField === 'fromDate') {
      const nextFromDate = parseComparableDate(nextDateValue);

      if (nextFromDate && nextFromDate > todayDate) {
        Alert.alert('Invalid start date', 'The start date cannot be later than today.');
        return;
      }

      if (toDate) {
        const currentToDate = parseComparableDate(toDate);

        if (nextFromDate && currentToDate && nextFromDate > currentToDate) {
          setFromDate(nextDateValue);
          setToDate('');
          Alert.alert('Date range updated', 'The end date was cleared because it was earlier than the new start date.');
          return;
        }
      }

      setFromDate(nextDateValue);
      return;
    }

    if (pickerField === 'toDate') {
      const selectedToDate = parseComparableDate(nextDateValue);

      if (selectedToDate && selectedToDate > todayDate) {
        Alert.alert('Invalid end date', 'The end date cannot be later than today.');
        return;
      }

      if (fromDate) {
        const currentFromDate = parseComparableDate(fromDate);

        if (currentFromDate && selectedToDate && selectedToDate < currentFromDate) {
          Alert.alert('Invalid end date', 'The end date cannot be earlier than the start date.');
          return;
        }
      }

      setToDate(nextDateValue);
    }
  };

  // Opens the native date picker for the requested date field.
  const openPicker = field => {
    if (!DateTimePicker) {
      Alert.alert('Date Picker Not Ready', 'Rebuild the app to use the calendar picker.');
      return;
    }

    setPickerField(field);
  };

  // Clears both date filters and closes the picker.
  const clearDateRange = () => {
    setFromDate('');
    setToDate('');
    setPickerField(null);
  };

  // Builds farm dropdown options from accessible farms.
  const farmOptions = useMemo(() => (
    reportData.farms.map(farm => ({
      value: String(farm.farm_id),
      label: farm.farm_name || `Farm ${farm.farm_id}`,
    }))
  ), [reportData.farms]);

  // Builds batch dropdown options filtered by the selected farm.
  const batchOptions = useMemo(() => (
    reportData.batches
      .filter(batch => selectedFarmId === 'all' || String(batch.farm_id) === selectedFarmId)
      .map(batch => ({
        value: String(batch.batch_id),
        label: `${batch.farm_name} - Batch ${batch.batch_id}${batch.breed ? ` (${batch.breed})` : ''}`,
      }))
  ), [reportData.batches, selectedFarmId]);

  // Resolves selected dropdown labels for display.
  const selectedFarmLabel = useMemo(() => {
    const selectedFarm = farmOptions.find(option => option.value === selectedFarmId);
    return selectedFarm?.label || 'All Farms';
  }, [farmOptions, selectedFarmId]);

  const selectedBatchLabel = useMemo(() => {
    const selectedBatch = batchOptions.find(option => option.value === selectedBatchId);
    return selectedBatch?.label || 'All Batches';
  }, [batchOptions, selectedBatchId]);

  // Checks farm and batch filters for one report row.
  const matchesFarmAndBatchFilters = useCallback(item => {
    if (selectedFarmId !== 'all' && String(item.farm_id) !== selectedFarmId) {
      return false;
    }

    if (selectedBatchId !== 'all' && String(item.batch_id) !== selectedBatchId) {
      return false;
    }

    return true;
  }, [selectedBatchId, selectedFarmId]);

  // Applies date, farm, and batch filters to every report dataset.
  const filteredReportData = useMemo(() => ({
    ...reportData,
    batches: reportData.batches.filter(item => (
      isWithinDateRange(item.start_date, parsedFromDate, parsedToDate)
      && matchesFarmAndBatchFilters(item)
    )),
    sales: reportData.sales.filter(item => (
      isWithinDateRange(item.sale_date, parsedFromDate, parsedToDate)
      && matchesFarmAndBatchFilters(item)
    )),
    expenses: reportData.expenses.filter(item => (
      isWithinDateRange(item.expense_date, parsedFromDate, parsedToDate)
      && matchesFarmAndBatchFilters(item)
    )),
    feed: reportData.feed.filter(item => (
      isWithinDateRange(item.date_recorded, parsedFromDate, parsedToDate)
      && matchesFarmAndBatchFilters(item)
    )),
    mortality: reportData.mortality.filter(item => (
      isWithinDateRange(item.date_recorded, parsedFromDate, parsedToDate)
      && matchesFarmAndBatchFilters(item)
    )),
    vaccinations: reportData.vaccinations.filter(item => (
      isWithinDateRange(item.vaccination_date, parsedFromDate, parsedToDate)
      && matchesFarmAndBatchFilters(item)
    )),
  }), [matchesFarmAndBatchFilters, parsedFromDate, parsedToDate, reportData]);

  // Builds the active report definitions, including summary cards, columns, and rows.
  const reportConfig = useMemo(() => {
    const batchData = filteredReportData.batches;
    const salesData = filteredReportData.sales;
    const expenseData = filteredReportData.expenses;
    const feedData = filteredReportData.feed;
    const mortalityData = filteredReportData.mortality;
    const vaccinationData = filteredReportData.vaccinations;
    const salesTotal = salesData.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);
    const expenseTotal = expenseData.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const feedTotalKg = feedData.reduce((sum, item) => sum + Number(item.feed_quantity || 0), 0);
    const remainingFeedByType = getFeedSummaryRemainingByType(feedData);
    const mortalityTotal = mortalityData.reduce((sum, item) => sum + Number(item.number_dead || 0), 0);
    const dueVaccinations = vaccinationData.filter(item => !!item.next_due_date).length;

    return {
      batches: {
        title: 'Batch Report',
        summary: [
          { label: 'Farms', value: String(getUniqueFarmCount(batchData)) },
          { label: 'Active Batches', value: String(batchData.filter(item => String(item.status).toLowerCase() === 'active').length) },
          { label: 'Birds Alive', value: String(batchData.reduce((sum, item) => sum + Number(item.birds_alive || 0), 0)) },
          { label: 'Revenue', value: formatCurrency(batchData.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0)) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'location', title: 'Location', width: 140 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'batch_name', title: 'Batch Name', width: 130 },
          { key: 'breed', title: 'Breed', width: 110 },
          { key: 'status', title: 'Status', width: 100 },
          { key: 'start_date', title: 'Start Date', width: 120 },
          { key: 'birds_alive', title: 'Alive', width: 90 },
          { key: 'birds_sold', title: 'Sold', width: 90 },
          { key: 'total_mortality', title: 'Dead', width: 90 },
          { key: 'feed_used', title: 'Feed (kg)', width: 110 },
          { key: 'total_expenses', title: 'Expenses', width: 120 },
          { key: 'total_revenue', title: 'Revenue', width: 120 },
        ],
        data: batchData,
        emptyText: 'No batch records found yet.',
      },
      sales: {
        title: 'Sales Report',
        summary: [
          { label: 'Sales Entries', value: String(salesData.length) },
          { label: 'Birds Sold', value: String(salesData.reduce((sum, item) => sum + Number(item.birds_sold || 0), 0)) },
          { label: 'Total Revenue', value: formatCurrency(salesTotal) },
          { label: 'Average Sale', value: salesData.length ? formatCurrency(salesTotal / salesData.length) : formatCurrency(0) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'location', title: 'Location', width: 140 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'batch_name', title: 'Batch Name', width: 130 },
          { key: 'birds_sold', title: 'Birds Sold', width: 100 },
          { key: 'price_per_bird', title: 'Price/Bird', width: 110 },
          { key: 'total_revenue', title: 'Revenue', width: 110 },
          { key: 'sale_date', title: 'Sale Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: salesData,
        emptyText: 'No sales records found yet.',
      },
      expenses: {
        title: 'Expense Report',
        summary: [
          { label: 'Expense Entries', value: String(expenseData.length) },
          { label: 'Total Expenses', value: formatCurrency(expenseTotal) },
          { label: 'Average Expense', value: expenseData.length ? formatCurrency(expenseTotal / expenseData.length) : formatCurrency(0) },
          { label: 'Farms Covered', value: String(getUniqueFarmCount(expenseData)) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'location', title: 'Location', width: 140 },
          { key: 'expense_scope_label', title: 'Scope', width: 100 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'batch_name', title: 'Batch Name', width: 130 },
          { key: 'description', title: 'Description', width: 180 },
          { key: 'amount', title: 'Amount', width: 110 },
          { key: 'expense_date', title: 'Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: expenseData,
        emptyText: 'No expense records found yet.',
      },
      feed: {
        title: 'Feed Report',
        summary: [
          { label: 'Feed Entries', value: String(feedData.length) },
          { label: 'Feed Used', value: `${formatNumber(feedTotalKg)} kg` },
          { label: 'Starter Left', value: `${formatNumber(remainingFeedByType.starter || 0)} kg` },
          { label: 'Grower Left', value: `${formatNumber(remainingFeedByType.grower || 0)} kg` },
          { label: 'Finisher Left', value: `${formatNumber(remainingFeedByType.finisher || 0)} kg` },
          { label: 'Farms Covered', value: String(getUniqueFarmCount(feedData)) },
          ...(currentUser?.role === 'worker'
            ? []
            : [{ label: 'Feed Cost', value: formatCurrency(feedData.reduce((sum, item) => sum + Number(item.feed_cost || 0), 0)) }]),
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'location', title: 'Location', width: 140 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'batch_name', title: 'Batch Name', width: 130 },
          { key: 'feed_type', title: 'Feed Type', width: 120 },
          { key: 'feed_quantity', title: 'Quantity (kg)', width: 120 },
          { key: 'remaining_feed', title: 'Remaining (kg)', width: 130 },
          ...(currentUser?.role === 'worker' ? [] : [{ key: 'feed_cost', title: 'Cost', width: 100 }]),
          { key: 'date_recorded', title: 'Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: feedData,
        emptyText: 'No feed records found yet.',
      },
      mortality: {
        title: 'Mortality Report',
        summary: [
          { label: 'Mortality Entries', value: String(mortalityData.length) },
          { label: 'Total Dead', value: String(mortalityTotal) },
          { label: 'Average per Entry', value: mortalityData.length ? formatNumber(mortalityTotal / mortalityData.length) : formatNumber(0) },
          { label: 'Farms Covered', value: String(getUniqueFarmCount(mortalityData)) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'location', title: 'Location', width: 140 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'batch_name', title: 'Batch Name', width: 130 },
          { key: 'number_dead', title: 'Number Dead', width: 110 },
          { key: 'cause_of_death', title: 'Cause', width: 180 },
          { key: 'date_recorded', title: 'Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: mortalityData,
        emptyText: 'No mortality records found yet.',
      },
      vaccinations: {
        title: 'Vaccination Report',
        summary: [
          { label: 'Vaccination Entries', value: String(vaccinationData.length) },
          { label: 'Next Doses Tracked', value: String(dueVaccinations) },
          { label: 'Farms Covered', value: String(getUniqueFarmCount(vaccinationData)) },
          { label: 'Batches Covered', value: String(new Set(vaccinationData.map(item => item.batch_id)).size) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'location', title: 'Location', width: 140 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'batch_name', title: 'Batch Name', width: 130 },
          { key: 'vaccine_name', title: 'Vaccine', width: 140 },
          { key: 'vaccination_date', title: 'Given On', width: 120 },
          { key: 'next_due_date', title: 'Next Due', width: 120 },
          { key: 'notes', title: 'Notes', width: 180 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: vaccinationData,
        emptyText: 'No vaccination records found yet.',
      },
    };
  }, [currentUser?.role, filteredReportData]);

  const currentReport = reportConfig[activeReport] || reportConfig[availableReportTypes[0]];

  // Exports the currently visible report to an Excel workbook.
  const handleExport = useCallback(async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting(true);
      const filePath = await exportReportToExcel({
        reportType: activeReport,
        report: currentReport,
      });

      Alert.alert(
        'Export complete',
        `Saved ${currentReport.title} as an Excel file.\n\nPath: ${filePath}`
      );
    } catch (error) {
      console.log('Report export failed', error);
      Alert.alert('Export failed', 'Could not create the Excel report right now.');
    } finally {
      setExporting(false);
    }
  }, [activeReport, currentReport, exporting]);

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Reports</Text>
      {/* Exports the active report with the current filters applied. */}
      <TouchableOpacity
        style={[styles.exportButton, exporting ? styles.exportButtonDisabled : null]}
        activeOpacity={0.85}
        onPress={handleExport}
        disabled={exporting}
      >
        <Text style={styles.exportButtonText}>
          {exporting ? 'Exporting Excel...' : 'Download Excel Report'}
        </Text>
      </TouchableOpacity>
      {/* Filters reports by period. */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Period</Text>
        <View style={styles.dateRangeRow}>
          <TouchableOpacity
            style={styles.dateChip}
            activeOpacity={0.85}
            onPress={() => openPicker('fromDate')}
          >
            <Text style={styles.dateChipLabel}>From</Text>
            <Text style={fromDate ? styles.dateChipValue : styles.dateChipPlaceholder}>
              {fromDate || 'Select date'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateChip}
            activeOpacity={0.85}
            onPress={() => openPicker('toDate')}
          >
            <Text style={styles.dateChipLabel}>To</Text>
            <Text style={toDate ? styles.dateChipValue : styles.dateChipPlaceholder}>
              {toDate || 'Select date'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.clearFilterButton}
          activeOpacity={0.85}
          onPress={clearDateRange}
        >
          <Text style={styles.clearFilterText}>Clear period filter</Text>
        </TouchableOpacity>
        {DateTimePicker && pickerField ? (
          <DateTimePicker
            value={
              pickerField === 'fromDate' && fromDate
                ? new Date(fromDate)
                : pickerField === 'toDate' && toDate
                  ? new Date(toDate)
                  : new Date()
            }
            mode="date"
            display="default"
            maximumDate={pickerField === 'toDate' || pickerField === 'fromDate' ? todayDate : undefined}
            onChange={handlePickerChange}
          />
        ) : null}
      </View>
      {/* Filters reports by farm and batch. */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Farm And Batch</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            activeOpacity={0.85}
            onPress={() => {
              setShowFarmDropdown(previous => !previous);
              setShowBatchDropdown(false);
            }}
          >
            <Text style={styles.dropdownTriggerLabel}>Farm</Text>
            <Text style={styles.dropdownTriggerText}>{selectedFarmLabel}</Text>
          </TouchableOpacity>
          {showFarmDropdown ? (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={[styles.dropdownOption, selectedFarmId === 'all' ? styles.dropdownOptionSelected : null]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedFarmId('all');
                  setSelectedBatchId('all');
                  setShowFarmDropdown(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedFarmId === 'all' ? styles.dropdownOptionTextSelected : null]}>
                  All Farms
                </Text>
              </TouchableOpacity>
              {farmOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.dropdownOption, selectedFarmId === option.value ? styles.dropdownOptionSelected : null]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedFarmId(option.value);
                    setSelectedBatchId('all');
                    setShowFarmDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, selectedFarmId === option.value ? styles.dropdownOptionTextSelected : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            activeOpacity={0.85}
            onPress={() => {
              setShowBatchDropdown(previous => !previous);
              setShowFarmDropdown(false);
            }}
          >
            <Text style={styles.dropdownTriggerLabel}>Batch</Text>
            <Text style={styles.dropdownTriggerText}>{selectedBatchLabel}</Text>
          </TouchableOpacity>
          {showBatchDropdown ? (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={[styles.dropdownOption, selectedBatchId === 'all' ? styles.dropdownOptionSelected : null]}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedBatchId('all');
                  setShowBatchDropdown(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedBatchId === 'all' ? styles.dropdownOptionTextSelected : null]}>
                  All Batches
                </Text>
              </TouchableOpacity>
              {batchOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.dropdownOption, selectedBatchId === option.value ? styles.dropdownOptionSelected : null]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedBatchId(option.value);
                    setShowBatchDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, selectedBatchId === option.value ? styles.dropdownOptionTextSelected : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.clearFilterButton}
          activeOpacity={0.85}
          onPress={() => {
            setSelectedFarmId('all');
            setSelectedBatchId('all');
            setShowFarmDropdown(false);
            setShowBatchDropdown(false);
          }}
        >
          <Text style={styles.clearFilterText}>Clear farm and batch filter</Text>
        </TouchableOpacity>
      </View>
      {/* Selects which report type is currently displayed. */}
      <View style={styles.reportPicker}>
        {availableReportTypes.map(reportType => {
          const isSelected = activeReport === reportType;
          const label = reportType.charAt(0).toUpperCase() + reportType.slice(1);

          return (
            <TouchableOpacity
              key={reportType}
              style={[styles.reportChip, isSelected ? styles.reportChipSelected : null]}
              activeOpacity={0.85}
              onPress={() => setActiveReport(reportType)}
            >
              <Text style={[styles.reportChipText, isSelected ? styles.reportChipTextSelected : null]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Shows summary metrics and table rows for the active report. */}
      <View style={styles.reportCard}>
        <Text style={styles.sectionTitle}>{currentReport.title}</Text>
        <Text style={styles.periodText}>
          {fromDate || toDate
            ? `Showing records from ${fromDate || 'the beginning'} to ${toDate || 'today'}`
            : 'Showing records for all time'}
        </Text>
        <Text style={styles.periodText}>
          {selectedFarmId === 'all' ? 'Farm: All Farms' : `Farm: ${selectedFarmLabel}`}
          {' | '}
          {selectedBatchId === 'all' ? 'Batch: All Batches' : `Batch: ${selectedBatchLabel}`}
        </Text>

        <View style={styles.summaryGrid}>
          {currentReport.summary.map(item => (
            <SummaryCard
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </View>

        <View style={styles.tableWrap}>
          <DataTable
            columns={currentReport.columns}
            data={currentReport.data}
            keyExtractor={(item, index) => String(
              item.sale_id
              || item.expense_id
              || item.feed_id
              || item.mortality_id
              || item.vaccination_id
              || item.batch_id
              || index
            )}
            emptyText={currentReport.emptyText}
            renderCell={(item, column) => {
              const value = item[column.key];

              if (ZERO_DEFAULT_KEYS.includes(column.key)) {
                const numericValue = Number(value || 0);
                return <Text style={styles.cellText}>{Number.isFinite(numericValue) ? String(numericValue) : '0'}</Text>;
              }

              if (['amount', 'feed_cost', 'price_per_bird', 'total_revenue', 'total_expenses'].includes(column.key)) {
                return <Text style={styles.cellText}>{formatCurrency(value)}</Text>;
              }

              if (['feed_quantity', 'feed_used', 'remaining_feed'].includes(column.key)) {
                return <Text style={styles.cellText}>{formatNumber(value)}</Text>;
              }

              if (['batch_status', 'status'].includes(column.key)) {
                return <Text style={[styles.cellText, styles.statusText]}>{String(value || 'N/A')}</Text>;
              }

              return <Text style={styles.cellText}>{String(value || 'N/A')}</Text>;
            }}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Reports screen layout and export button styles.
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  exportButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: '#166534',
    fontWeight: '700',
  },
  // Filter card, date chip, and dropdown styles.
  filterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dateChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateChipLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateChipValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  dateChipPlaceholder: {
    color: '#94a3b8',
    fontSize: 15,
  },
  clearFilterButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 252, 231, 0.14)',
  },
  clearFilterText: {
    color: '#dcfce7',
    fontWeight: '600',
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownTriggerLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dropdownTriggerText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  dropdownOptionText: {
    color: '#0f172a',
    fontSize: 14,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
  },
  reportPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  // Report type chip styles.
  reportChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  reportChipSelected: {
    backgroundColor: '#dcfce7',
  },
  reportChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  reportChipTextSelected: {
    color: '#166534',
  },
  // Report summary, table, and cell styles.
  reportCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  periodText: {
    color: '#cbd5e1',
    marginBottom: 12,
  },
  summaryGrid: {
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    padding: 14,
  },
  summaryLabel: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
  },
  tableWrap: {
    marginTop: 4,
  },
  cellText: {
    color: '#0f172a',
    fontSize: 13,
  },
  statusText: {
    textTransform: 'capitalize',
    fontWeight: '700',
  },
});
