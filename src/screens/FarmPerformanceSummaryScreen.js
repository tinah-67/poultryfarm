import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import DataTable from '../components/DataTable';
import {
  getAccessibleFarms,
  getBatchesByFarmId,
  getExpensesByFarmId,
  getExpensesByBatchId,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
} from '../database/db';

const formatNumber = (value, digits = 2) => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return 'N/A';
  }

  return numericValue.toFixed(digits);
};

const formatCurrency = value => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return 'N/A';
  }

  return numericValue.toFixed(2);
};

const createEmptyMetrics = () => ({
  initialChicks: 0,
  birdsAlive: 0,
  totalMortality: 0,
  mortalityRate: 0,
  totalFeedUsed: 0,
  totalFeedCost: 0,
  otherExpenses: 0,
  totalExpenses: 0,
  birdsSold: 0,
  revenue: 0,
  profit: 0,
  fcr: null,
  batchCount: 0,
});

const calculateMetricsFromTotals = totals => {
  const mortalityRate = totals.initialChicks > 0 ? (totals.totalMortality / totals.initialChicks) * 100 : 0;
  const totalExpenses = totals.totalFeedCost + totals.otherExpenses;
  const profit = totals.revenue - totalExpenses;
  const fcr = totals.birdsSold > 0 ? totals.totalFeedUsed / totals.birdsSold : null;

  return {
    ...totals,
    birdsAlive: Math.max(totals.initialChicks - totals.totalMortality - totals.birdsSold, 0),
    mortalityRate,
    totalExpenses,
    profit,
    fcr,
  };
};

export default function FarmPerformanceSummaryScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const initialFarmId = route?.params?.initialFarmId;

  const [currentUser, setCurrentUser] = useState(null);
  const [farmSummaries, setFarmSummaries] = useState([]);
  const [overallMetrics, setOverallMetrics] = useState(createEmptyMetrics());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState('all');
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);

  const loadSummary = useCallback((done) => {
    if (!userId) {
      setCurrentUser(null);
      setFarmSummaries([]);
      setOverallMetrics(createEmptyMetrics());
      done && done();
      return;
    }

    getUserById(userId, user => {
      setCurrentUser(user);

      if (user?.role === 'worker') {
        setFarmSummaries([]);
        setOverallMetrics(createEmptyMetrics());
        setSelectedFarmId('all');
        setShowFarmDropdown(false);
        Alert.alert('Access denied', 'Workers cannot view farm performance summaries.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        done && done();
        return;
      }

      getAccessibleFarms(userId, farms => {
        const safeFarms = farms || [];

        if (safeFarms.length === 0) {
          setFarmSummaries([]);
          setOverallMetrics(createEmptyMetrics());
          setSelectedFarmId('all');
          setShowFarmDropdown(false);
          done && done();
          return;
        }

        const summaryResults = [];
        const totalFarmOperations = safeFarms.length * 2;
        let completedFarmOperations = 0;

        const finalizeFarmSummaryLoad = () => {
          completedFarmOperations += 1;

          if (completedFarmOperations !== totalFarmOperations) {
            return;
          }

          const overallTotals = summaryResults.reduce((accumulator, item) => ({
            initialChicks: accumulator.initialChicks + item.metrics.initialChicks,
            birdsAlive: accumulator.birdsAlive + item.metrics.birdsAlive,
            totalMortality: accumulator.totalMortality + item.metrics.totalMortality,
            mortalityRate: 0,
            totalFeedUsed: accumulator.totalFeedUsed + item.metrics.totalFeedUsed,
            totalFeedCost: accumulator.totalFeedCost + item.metrics.totalFeedCost,
            otherExpenses: accumulator.otherExpenses + item.metrics.otherExpenses,
            totalExpenses: 0,
            birdsSold: accumulator.birdsSold + item.metrics.birdsSold,
            revenue: accumulator.revenue + item.metrics.revenue,
            profit: 0,
            fcr: null,
            batchCount: accumulator.batchCount + item.metrics.batchCount,
          }), createEmptyMetrics());

          setFarmSummaries(
            summaryResults.sort((left, right) => left.farm_name.localeCompare(right.farm_name))
          );
          setOverallMetrics(calculateMetricsFromTotals(overallTotals));
          setSelectedFarmId(previous =>
            previous !== 'all' && summaryResults.some(item => String(item.farm_id) === String(previous))
              ? previous
              : initialFarmId != null && summaryResults.some(item => String(item.farm_id) === String(initialFarmId))
                ? String(initialFarmId)
                : 'all'
          );
          done && done();
        };

        safeFarms.forEach(farm => {
          getBatchesByFarmId(farm.farm_id, batches => {
            const safeBatches = batches || [];
            const farmTotals = createEmptyMetrics();
            farmTotals.batchCount = safeBatches.length;
            let farmExpensesLoaded = false;
            let batchMetricsLoaded = false;

            const maybeFinalizeFarm = () => {
              if (!farmExpensesLoaded || !batchMetricsLoaded) {
                return;
              }

              const metrics = calculateMetricsFromTotals(farmTotals);
              summaryResults.push({ ...farm, metrics });
              finalizeFarmSummaryLoad();
            };

            getExpensesByFarmId(farm.farm_id, expenseRecords => {
              farmTotals.otherExpenses += (expenseRecords || []).reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
              );

              farmExpensesLoaded = true;
              maybeFinalizeFarm();
            });

            if (safeBatches.length === 0) {
              batchMetricsLoaded = true;
              maybeFinalizeFarm();

              return;
            }

            let processedBatches = 0;

            safeBatches.forEach(batch => {
              getFeedRecordsByBatchId(batch.batch_id, feedRecords => {
                getMortalityRecordsByBatchId(batch.batch_id, mortalityRecords => {
                  getExpensesByBatchId(batch.batch_id, expenseRecords => {
                    getSalesByBatchId(batch.batch_id, saleRecords => {
                      farmTotals.initialChicks += Number(batch.initial_chicks || 0);
                      farmTotals.otherExpenses += Number(batch.purchase_cost || 0);
                      farmTotals.totalMortality += (mortalityRecords || []).reduce(
                        (sum, item) => sum + Number(item.number_dead || 0),
                        0
                      );
                      farmTotals.totalFeedUsed += (feedRecords || []).reduce(
                        (sum, item) => sum + Number(item.feed_quantity || 0),
                        0
                      );
                      farmTotals.totalFeedCost += (feedRecords || []).reduce(
                        (sum, item) => sum + Number(item.feed_cost || 0),
                        0
                      );
                      farmTotals.otherExpenses += (expenseRecords || []).reduce(
                        (sum, item) => sum + Number(item.amount || 0),
                        0
                      );
                      farmTotals.birdsSold += (saleRecords || []).reduce(
                        (sum, item) => sum + Number(item.birds_sold || 0),
                        0
                      );
                      farmTotals.revenue += (saleRecords || []).reduce(
                        (sum, item) => sum + Number(item.total_revenue || 0),
                        0
                      );

                      processedBatches += 1;

                      if (processedBatches === safeBatches.length) {
                        batchMetricsLoaded = true;
                        maybeFinalizeFarm();
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
  }, [initialFarmId, navigation, userId]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    setShowFarmDropdown(false);
    loadSummary(() => setRefreshing(false));
  };

  const roleLabel = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'User';
  const selectedFarmSummary = useMemo(
    () => farmSummaries.find(farm => String(farm.farm_id) === String(selectedFarmId)) ?? null,
    [farmSummaries, selectedFarmId]
  );
  const activeMetrics = selectedFarmSummary?.metrics ?? overallMetrics;
  const summaryTitle = selectedFarmSummary ? `${selectedFarmSummary.farm_name} Summary` : 'Overall Summary';
  const summaryMeta = selectedFarmSummary
    ? `Location: ${selectedFarmSummary.location || 'N/A'} | Batches: ${selectedFarmSummary.metrics.batchCount}`
    : `Farms: ${farmSummaries.length} | Batches: ${overallMetrics.batchCount}`;
  const summaryRows = [
    {
      metric: 'Birds Alive',
      value: String(activeMetrics.birdsAlive),
      note: `Initial chicks: ${activeMetrics.initialChicks}`,
    },
    {
      metric: 'Total Dead',
      value: String(activeMetrics.totalMortality),
      note: `Mortality rate: ${formatNumber(activeMetrics.mortalityRate)}%`,
    },
    {
      metric: 'Total Sold',
      value: String(activeMetrics.birdsSold),
      note: 'Birds sold across tracked batches',
    },
    {
      metric: 'Mortality Rate',
      value: `${formatNumber(activeMetrics.mortalityRate)}%`,
      note: `Based on ${activeMetrics.initialChicks} initial chicks`,
    },
    {
      metric: 'Feed Used',
      value: `${formatNumber(activeMetrics.totalFeedUsed)} kg`,
      note: `FCR: ${activeMetrics.fcr == null ? 'N/A' : formatNumber(activeMetrics.fcr)}`,
    },
    {
      metric: 'Expenses',
      value: formatCurrency(activeMetrics.totalExpenses),
      note: 'Includes chick purchase and other costs',
    },
    {
      metric: 'Revenue',
      value: formatCurrency(activeMetrics.revenue),
      note: 'Total sales revenue',
    },
    {
      metric: 'Profit',
      value: formatCurrency(activeMetrics.profit),
      note: activeMetrics.profit >= 0 ? 'Revenue minus expenses' : 'Currently running at a loss',
    },
  ];
  const summaryColumns = [
    { key: 'metric', title: 'Metric', width: 170 },
    { key: 'value', title: 'Value', width: 140 },
    { key: 'note', title: 'Note', width: 240 },
  ];
  const farmColumns = [
    { key: 'farm_name', title: 'Farm', width: 140 },
    { key: 'location', title: 'Location', width: 140 },
    { key: 'batchCount', title: 'Batches', width: 90 },
    { key: 'birdsAlive', title: 'Alive', width: 90 },
    { key: 'totalMortality', title: 'Dead', width: 90 },
    { key: 'birdsSold', title: 'Sold', width: 90 },
    { key: 'mortalityRate', title: 'Mortality %', width: 110 },
    { key: 'totalFeedUsed', title: 'Feed (kg)', width: 110 },
    { key: 'totalExpenses', title: 'Expenses', width: 120 },
    { key: 'revenue', title: 'Revenue', width: 120 },
    { key: 'profit', title: 'Profit', width: 120 },
  ];

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Farm Performance Summary</Text>
      <Text style={styles.subtitle}>
        {selectedFarmSummary ? `${roleLabel} view for ${selectedFarmSummary.farm_name}` : `${roleLabel} view across accessible farms`}
      </Text>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Choose farm</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          activeOpacity={0.8}
          onPress={() => setShowFarmDropdown(previous => !previous)}
        >
          <Text style={styles.dropdownTriggerText}>
            {selectedFarmSummary?.farm_name ?? 'All farms'}
          </Text>
          <Text style={styles.dropdownChevron}>{showFarmDropdown ? '^' : 'v'}</Text>
        </TouchableOpacity>

        {showFarmDropdown ? (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={[styles.dropdownOption, selectedFarmSummary == null ? styles.dropdownOptionSelected : null]}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedFarmId('all');
                setShowFarmDropdown(false);
              }}
            >
              <Text style={[styles.dropdownOptionText, selectedFarmSummary == null ? styles.dropdownOptionTextSelected : null]}>
                All farms
              </Text>
            </TouchableOpacity>

            {farmSummaries.map(farm => {
              const isSelected = String(farm.farm_id) === String(selectedFarmId);

              return (
                <TouchableOpacity
                  key={farm.farm_id}
                  style={[styles.dropdownOption, isSelected ? styles.dropdownOptionSelected : null]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedFarmId(String(farm.farm_id));
                    setShowFarmDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, isSelected ? styles.dropdownOptionTextSelected : null]}>
                    {farm.farm_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.overallCard}>
        <Text style={styles.sectionTitle}>{summaryTitle}</Text>
        <Text style={styles.overallMeta}>{summaryMeta}</Text>
        <DataTable
          columns={summaryColumns}
          data={summaryRows}
          keyExtractor={item => item.metric}
          emptyText="No summary data found."
          renderCell={(item, column) => (
            <Text style={styles.tableCellText}>{String(item[column.key] ?? 'N/A')}</Text>
          )}
        />
      </View>

      {!selectedFarmSummary ? <Text style={styles.sectionTitle}>By Farm</Text> : null}
      {!selectedFarmSummary && farmSummaries.length > 0 ? (
        <View style={styles.farmTableCard}>
          <DataTable
            columns={farmColumns}
            data={farmSummaries.map(farm => ({
              farm_id: farm.farm_id,
              farm_name: farm.farm_name,
              location: farm.location || 'N/A',
              batchCount: farm.metrics.batchCount,
              birdsAlive: farm.metrics.birdsAlive,
              totalMortality: farm.metrics.totalMortality,
              birdsSold: farm.metrics.birdsSold,
              mortalityRate: `${formatNumber(farm.metrics.mortalityRate)}%`,
              totalFeedUsed: formatNumber(farm.metrics.totalFeedUsed),
              totalExpenses: formatCurrency(farm.metrics.totalExpenses),
              revenue: formatCurrency(farm.metrics.revenue),
              profit: formatCurrency(farm.metrics.profit),
            }))}
            keyExtractor={item => String(item.farm_id)}
            emptyText="No farms to report yet."
            renderCell={(item, column) => (
              <Text style={styles.tableCellText}>{String(item[column.key] ?? 'N/A')}</Text>
            )}
          />
        </View>
      ) : (
        !selectedFarmSummary ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No farms to report yet</Text>
            <Text style={styles.emptyText}>Add a farm and record batch activity to see farm-level performance here.</Text>
          </View>
        ) : null
      )}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Report Note</Text>
        <Text style={styles.noteText}>
          This summary is grouped by accessible farms, then rolled up across all their batches. FCR is currently calculated
          as total feed used divided by birds sold.
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
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
  subtitle: {
    color: '#e2e8f0',
    marginBottom: 16,
  },
  filterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 18,
  },
  filterLabel: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  overallCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 18,
  },
  overallMeta: {
    color: '#cbd5e1',
    marginBottom: 14,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
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
  dropdownChevron: {
    color: '#475569',
    fontSize: 12,
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dropdownOptionSelected: {
    backgroundColor: '#dcfce7',
  },
  dropdownOptionText: {
    color: '#0f172a',
    fontSize: 15,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
  },
  farmTableCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  tableCellText: {
    color: '#334155',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#475569',
    lineHeight: 20,
  },
  noteCard: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  noteTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  noteText: {
    color: '#e2e8f0',
    lineHeight: 20,
  },
});
