import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import { exportReportToExcel } from '../services/reportExport';
import {
  getBatchById,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getExpensesByBatchId,
  getSalesByBatchId,
} from '../database/db';

// Formats numeric metric values with a fixed number of decimals.
const formatNumber = (value, digits = 2) => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return Number(0).toFixed(digits);
  }

  return numericValue.toFixed(digits);
};

// Formats currency values for metric cards and exports.
const formatCurrency = value => {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return '0.00';
  }

  return numericValue.toFixed(2);
};

// Renders one performance metric card.
const MetricCard = ({ label, value, helper }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
  </View>
);

// Calculates and displays performance metrics for one batch.
export default function BatchPerformanceScreen({ route }) {
  // Stores route context, loaded batch data, calculated metrics, and export state.
  const batchId = route?.params?.batchId;
  const farmName = route?.params?.farmName;

  const [batch, setBatch] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Loads batch records and calculates mortality, feed, expense, revenue, and profit metrics.
  const loadPerformance = useCallback((done) => {
    if (!batchId) {
      setBatch(null);
      setMetrics(null);
      done && done();
      return;
    }

    getBatchById(batchId, batchRecord => {
      if (!batchRecord) {
        setBatch(null);
        setMetrics(null);
        done && done();
        return;
      }

      setBatch(batchRecord);

      getFeedRecordsByBatchId(batchId, feedRecords => {
        getMortalityRecordsByBatchId(batchId, mortalityRecords => {
          getExpensesByBatchId(batchId, expenseRecords => {
            getSalesByBatchId(batchId, saleRecords => {
              const totalMortality = (mortalityRecords || []).reduce(
                (sum, item) => sum + Number(item.number_dead || 0),
                0
              );
              const totalFeedUsed = (feedRecords || []).reduce(
                (sum, item) => sum + Number(item.feed_quantity || 0),
                0
              );
              const feedUsedByType = (feedRecords || []).reduce((totals, item) => {
                const feedType = String(item.feed_type || '').trim().toLowerCase();
                const feedQuantity = Number(item.feed_quantity || 0);

                if (!feedType) {
                  return totals;
                }

                return {
                  ...totals,
                  [feedType]: Number(totals[feedType] || 0) + feedQuantity,
                };
              }, {});
              const feedCostByType = (feedRecords || []).reduce((totals, item) => {
                const feedType = String(item.feed_type || '').trim().toLowerCase();
                const feedCost = Number(item.feed_cost || 0);

                if (!feedType) {
                  return totals;
                }

                return {
                  ...totals,
                  [feedType]: Number(totals[feedType] || 0) + feedCost,
                };
              }, {});
              const totalFeedCost = (feedRecords || []).reduce(
                (sum, item) => sum + Number(item.feed_cost || 0),
                0
              );
              const otherExpenses = (expenseRecords || []).reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
              );
              const totalRevenue = (saleRecords || []).reduce(
                (sum, item) => sum + Number(item.total_revenue || 0),
                0
              );
              const totalBirdsSold = (saleRecords || []).reduce(
                (sum, item) => sum + Number(item.birds_sold || 0),
                0
              );
              const initialChicks = Number(batchRecord.initial_chicks || 0);
              const purchaseCost = Number(batchRecord.purchase_cost || 0);
              const totalBirdsAlive = Math.max(initialChicks - totalMortality - totalBirdsSold, 0);
              const mortalityRate = initialChicks > 0 ? (totalMortality / initialChicks) * 100 : 0;
              const totalExpenses = totalFeedCost + otherExpenses + purchaseCost;
              const profit = totalRevenue - totalExpenses;
              setMetrics({
                totalBirdsAlive,
                mortalityRate,
                totalFeedUsed,
                totalExpenses,
                totalRevenue,
                profit,
                totalMortality,
                totalBirdsSold,
                totalFeedCost,
                feedUsedByType,
                feedCostByType,
                otherExpenses,
                purchaseCost,
              });
              done && done();
            });
          });
        });
      });
    });
  }, [batchId]);

  // Refreshes metrics whenever the screen receives focus.
  useFocusEffect(
    useCallback(() => {
      loadPerformance();
    }, [loadPerformance])
  );

  // Handles pull-to-refresh for batch performance data.
  const handleRefresh = () => {
    setRefreshing(true);
    loadPerformance(() => setRefreshing(false));
  };

  // Builds and exports the batch performance report as Excel.
  const handleExport = useCallback(async () => {
    if (!batch || !metrics || exporting) {
      return;
    }

    const report = {
      title: `${farmName ? `${farmName} ` : ''}Batch ${batchId} Performance`,
      summary: [
        { label: 'Farm', value: farmName || 'N/A' },
        { label: 'Batch ID', value: String(batchId || 'N/A') },
        { label: 'Breed', value: batch.breed || 'N/A' },
        { label: 'Start Date', value: batch.start_date || 'N/A' },
        { label: 'Birds Alive', value: String(metrics.totalBirdsAlive) },
        { label: 'Total Dead', value: String(metrics.totalMortality) },
        { label: 'Total Sold', value: String(metrics.totalBirdsSold) },
        { label: 'Mortality Rate', value: `${formatNumber(metrics.mortalityRate)}%` },
        { label: 'Total Feed Used', value: `${formatNumber(metrics.totalFeedUsed)} kg` },
        { label: 'Total Feed Cost', value: formatCurrency(metrics.totalFeedCost) },
        { label: 'Total Expenses', value: formatCurrency(metrics.totalExpenses) },
        { label: 'Revenue', value: formatCurrency(metrics.totalRevenue) },
        { label: 'Profit', value: formatCurrency(metrics.profit) },
      ],
      columns: [
        { key: 'metric', title: 'Metric' },
        { key: 'value', title: 'Value' },
        { key: 'note', title: 'Note' },
      ],
      data: [
        { metric: 'Birds Alive', value: String(metrics.totalBirdsAlive), note: `Initial chicks: ${batch.initial_chicks ?? 0}` },
        { metric: 'Total Dead', value: String(metrics.totalMortality), note: `Mortality rate: ${formatNumber(metrics.mortalityRate)}%` },
        { metric: 'Total Sold', value: String(metrics.totalBirdsSold), note: 'Birds sold from this batch' },
        { metric: 'Total Feed Used', value: `${formatNumber(metrics.totalFeedUsed)} kg`, note: `Feed cost: ${formatCurrency(metrics.totalFeedCost)}` },
        { metric: 'Starter Feed Cost', value: formatCurrency(metrics.feedCostByType?.starter || 0), note: `Feed used: ${formatNumber(metrics.feedUsedByType?.starter || 0)} kg` },
        { metric: 'Grower Feed Cost', value: formatCurrency(metrics.feedCostByType?.grower || 0), note: `Feed used: ${formatNumber(metrics.feedUsedByType?.grower || 0)} kg` },
        { metric: 'Finisher Feed Cost', value: formatCurrency(metrics.feedCostByType?.finisher || 0), note: `Feed used: ${formatNumber(metrics.feedUsedByType?.finisher || 0)} kg` },
        { metric: 'Total Expenses', value: formatCurrency(metrics.totalExpenses), note: `Chick purchase: ${formatCurrency(metrics.purchaseCost)}` },
        { metric: 'Revenue', value: formatCurrency(metrics.totalRevenue), note: 'Total sales revenue' },
        { metric: 'Profit', value: formatCurrency(metrics.profit), note: metrics.profit >= 0 ? 'Revenue minus expenses' : 'This batch is currently at a loss' },
      ],
    };

    try {
      setExporting(true);
      const filePath = await exportReportToExcel({
        reportType: 'batch-performance',
        report,
      });

      Alert.alert(
        'Export complete',
        `Saved Batch Performance as an Excel file.\n\nPath: ${filePath}`
      );
    } catch (error) {
      console.log('Batch performance export failed', error);
      Alert.alert('Export failed', 'Could not create the batch performance report right now.');
    } finally {
      setExporting(false);
    }
  }, [batch, batchId, exporting, farmName, metrics]);

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Batch Performance</Text>
      {/* Exports the current batch performance view. */}
      <TouchableOpacity
        style={[styles.exportButton, exporting ? styles.exportButtonDisabled : null]}
        activeOpacity={0.85}
        onPress={handleExport}
        disabled={exporting || !metrics}
      >
        <Text style={styles.exportButtonText}>
          {exporting ? 'Exporting Excel...' : 'Download Batch Performance'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>Batch ID: {batchId ?? 'N/A'}</Text>
      {farmName ? <Text style={styles.subtitle}>Farm: {farmName}</Text> : null}
      {batch ? (
        <Text style={styles.subtitle}>
          Breed: {batch.breed} | Started: {batch.start_date}
        </Text>
      ) : (
        <Text style={styles.subtitle}>No batch data found.</Text>
      )}

      {metrics ? (
        <>
          {/* Shows the calculated performance metrics. */}
          <View style={styles.metricsGrid}>
            <MetricCard label="Total Birds Alive" value={String(metrics.totalBirdsAlive)} helper={`Initial chicks: ${batch?.initial_chicks ?? 0}`} />
            <MetricCard label="Total Dead" value={String(metrics.totalMortality)} helper={`Mortality rate: ${formatNumber(metrics.mortalityRate)}%`} />
            <MetricCard label="Total Sold" value={String(metrics.totalBirdsSold)} />
            <MetricCard label="Mortality Rate" value={`${formatNumber(metrics.mortalityRate)}%`} helper={`Based on ${batch?.initial_chicks ?? 0} initial chicks`} />
            <MetricCard label="Total Feed Used" value={`${formatNumber(metrics.totalFeedUsed)} kg`} helper={`Feed cost: ${formatCurrency(metrics.totalFeedCost)}`} />
            <MetricCard
              label="Starter Feed Cost"
              value={formatCurrency(metrics.feedCostByType?.starter || 0)}
              helper={`Feed used: ${formatNumber(metrics.feedUsedByType?.starter || 0)} kg`}
            />
            <MetricCard
              label="Grower Feed Cost"
              value={formatCurrency(metrics.feedCostByType?.grower || 0)}
              helper={`Feed used: ${formatNumber(metrics.feedUsedByType?.grower || 0)} kg`}
            />
            <MetricCard
              label="Finisher Feed Cost"
              value={formatCurrency(metrics.feedCostByType?.finisher || 0)}
              helper={`Feed used: ${formatNumber(metrics.feedUsedByType?.finisher || 0)} kg`}
            />
            <MetricCard label="Total Expenses" value={formatCurrency(metrics.totalExpenses)} helper={`Chick purchase: ${formatCurrency(metrics.purchaseCost)}`} />
            <MetricCard label="Revenue" value={formatCurrency(metrics.totalRevenue)} />
            <MetricCard label="Profit" value={formatCurrency(metrics.profit)} helper={metrics.profit >= 0 ? 'Revenue minus expenses' : 'This batch is currently at a loss'} />
          </View>

          {/* Explains how the performance values are calculated. */}
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Report Note</Text>
            <Text style={styles.noteText}>
              Feed use, feed cost, expenses, revenue, and profit are shown here based on the records saved for this batch.
            </Text>
          </View>
        </>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Batch performance layout, export, metric, and note styles.
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
    marginBottom: 12,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: '#166534',
    fontWeight: '700',
  },
  subtitle: {
    color: '#e2e8f0',
    marginBottom: 6,
  },
  metricsGrid: {
    marginTop: 18,
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 16,
  },
  metricLabel: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 6,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '700',
  },
  metricHelper: {
    color: '#64748b',
    marginTop: 6,
  },
  noteCard: {
    marginTop: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
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
