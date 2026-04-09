import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import {
  getBatchById,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getExpensesByBatchId,
  getSalesByBatchId,
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

const MetricCard = ({ label, value, helper }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
  </View>
);

export default function BatchPerformanceScreen({ route }) {
  const batchId = route?.params?.batchId;
  const farmName = route?.params?.farmName;

  const [batch, setBatch] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
              const fcr = totalBirdsSold > 0 ? totalFeedUsed / totalBirdsSold : null;

              setMetrics({
                totalBirdsAlive,
                mortalityRate,
                totalFeedUsed,
                fcr,
                totalExpenses,
                totalRevenue,
                profit,
                totalMortality,
                totalBirdsSold,
                totalFeedCost,
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

  useFocusEffect(
    useCallback(() => {
      loadPerformance();
    }, [loadPerformance])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadPerformance(() => setRefreshing(false));
  };

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Batch Performance</Text>
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
          <View style={styles.metricsGrid}>
            <MetricCard label="Total Birds Alive" value={String(metrics.totalBirdsAlive)} helper={`Initial chicks: ${batch?.initial_chicks ?? 0}`} />
            <MetricCard label="Total Dead" value={String(metrics.totalMortality)} helper={`Mortality rate: ${formatNumber(metrics.mortalityRate)}%`} />
            <MetricCard label="Total Sold" value={String(metrics.totalBirdsSold)} />
            <MetricCard label="Mortality Rate" value={`${formatNumber(metrics.mortalityRate)}%`} helper={`Based on ${batch?.initial_chicks ?? 0} initial chicks`} />
            <MetricCard label="Total Feed Used" value={`${formatNumber(metrics.totalFeedUsed)} kg`} helper={`Feed cost: ${formatCurrency(metrics.totalFeedCost)}`} />
            <MetricCard label="FCR" value={metrics.fcr == null ? 'N/A' : formatNumber(metrics.fcr)} helper={metrics.fcr == null ? 'Needs birds sold to calculate' : `Birds sold: ${metrics.totalBirdsSold}`} />
            <MetricCard label="Total Expenses" value={formatCurrency(metrics.totalExpenses)} helper={`Chick purchase: ${formatCurrency(metrics.purchaseCost)}`} />
            <MetricCard label="Revenue" value={formatCurrency(metrics.totalRevenue)} />
            <MetricCard label="Profit" value={formatCurrency(metrics.profit)} helper={metrics.profit >= 0 ? 'Revenue minus expenses' : 'This batch is currently at a loss'} />
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Report Note</Text>
            <Text style={styles.noteText}>
              FCR in this first version is calculated as total feed used divided by birds sold. For a more complete broiler FCR,
              we can later add live-weight tracking.
            </Text>
          </View>
        </>
      ) : null}
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
