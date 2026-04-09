import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import DataTable from '../components/DataTable';
import {
  getAccessibleFarms,
  getBatchesByFarmId,
  getExpensesByBatchId,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getVaccinationRecordsByBatchId,
} from '../database/db';

const REPORT_TYPES = ['batches', 'sales', 'expenses', 'feed', 'mortality', 'vaccinations'];

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
    return '0.00';
  }

  return numericValue.toFixed(2);
};

const createEmptyData = () => ({
  farms: [],
  batches: [],
  sales: [],
  expenses: [],
  feed: [],
  mortality: [],
  vaccinations: [],
});

const SummaryCard = ({ label, value }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

export default function ReportsScreen({ route }) {
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(createEmptyData());
  const [activeReport, setActiveReport] = useState('batches');

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
      let processedFarms = 0;

      safeFarms.forEach(farm => {
        getBatchesByFarmId(farm.farm_id, batches => {
          const safeBatches = batches || [];

          if (safeBatches.length === 0) {
            processedFarms += 1;

            if (processedFarms === safeFarms.length) {
              setReportData(nextData);
              done && done();
            }

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
                        farm_name: farm.farm_name,
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
                          farm_name: farm.farm_name,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeExpenseRecords.forEach(record => {
                        nextData.expenses.push({
                          ...record,
                          farm_name: farm.farm_name,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeFeedRecords.forEach(record => {
                        nextData.feed.push({
                          ...record,
                          farm_name: farm.farm_name,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeMortalityRecords.forEach(record => {
                        nextData.mortality.push({
                          ...record,
                          farm_name: farm.farm_name,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      safeVaccinationRecords.forEach(record => {
                        nextData.vaccinations.push({
                          ...record,
                          farm_name: farm.farm_name,
                          breed: batch.breed,
                          batch_status: batch.status || 'active',
                        });
                      });

                      processedBatches += 1;

                      if (processedBatches === safeBatches.length) {
                        processedFarms += 1;

                        if (processedFarms === safeFarms.length) {
                          setReportData({
                            ...nextData,
                            batches: nextData.batches.sort((left, right) => String(right.start_date).localeCompare(String(left.start_date))),
                            sales: nextData.sales.sort((left, right) => String(right.sale_date).localeCompare(String(left.sale_date))),
                            expenses: nextData.expenses.sort((left, right) => String(right.expense_date).localeCompare(String(left.expense_date))),
                            feed: nextData.feed.sort((left, right) => String(right.date_recorded).localeCompare(String(left.date_recorded))),
                            mortality: nextData.mortality.sort((left, right) => String(right.date_recorded).localeCompare(String(left.date_recorded))),
                            vaccinations: nextData.vaccinations.sort((left, right) => String(right.vaccination_date).localeCompare(String(left.vaccination_date))),
                          });
                          done && done();
                        }
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

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports(() => setRefreshing(false));
  };

  const reportConfig = useMemo(() => {
    const salesTotal = reportData.sales.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0);
    const expenseTotal = reportData.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const feedTotalKg = reportData.feed.reduce((sum, item) => sum + Number(item.feed_quantity || 0), 0);
    const mortalityTotal = reportData.mortality.reduce((sum, item) => sum + Number(item.number_dead || 0), 0);
    const dueVaccinations = reportData.vaccinations.filter(item => !!item.next_due_date).length;

    return {
      batches: {
        title: 'Batch Report',
        summary: [
          { label: 'Farms', value: String(reportData.farms.length), helper: `Batches listed: ${reportData.batches.length}` },
          { label: 'Active Batches', value: String(reportData.batches.filter(item => String(item.status).toLowerCase() === 'active').length) },
          { label: 'Birds Alive', value: String(reportData.batches.reduce((sum, item) => sum + Number(item.birds_alive || 0), 0)) },
          { label: 'Revenue', value: formatCurrency(reportData.batches.reduce((sum, item) => sum + Number(item.total_revenue || 0), 0)) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
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
        data: reportData.batches,
        emptyText: 'No batch records found yet.',
      },
      sales: {
        title: 'Sales Report',
        summary: [
          { label: 'Sales Entries', value: String(reportData.sales.length) },
          { label: 'Birds Sold', value: String(reportData.sales.reduce((sum, item) => sum + Number(item.birds_sold || 0), 0)) },
          { label: 'Total Revenue', value: formatCurrency(salesTotal) },
          { label: 'Average Sale', value: reportData.sales.length ? formatCurrency(salesTotal / reportData.sales.length) : formatCurrency(0) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'birds_sold', title: 'Birds Sold', width: 100 },
          { key: 'price_per_bird', title: 'Price/Bird', width: 110 },
          { key: 'total_revenue', title: 'Revenue', width: 110 },
          { key: 'sale_date', title: 'Sale Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: reportData.sales,
        emptyText: 'No sales records found yet.',
      },
      expenses: {
        title: 'Expense Report',
        summary: [
          { label: 'Expense Entries', value: String(reportData.expenses.length) },
          { label: 'Total Expenses', value: formatCurrency(expenseTotal) },
          { label: 'Average Expense', value: reportData.expenses.length ? formatCurrency(expenseTotal / reportData.expenses.length) : formatCurrency(0) },
          { label: 'Farms Covered', value: String(reportData.farms.length) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'description', title: 'Description', width: 180 },
          { key: 'amount', title: 'Amount', width: 110 },
          { key: 'expense_date', title: 'Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: reportData.expenses,
        emptyText: 'No expense records found yet.',
      },
      feed: {
        title: 'Feed Report',
        summary: [
          { label: 'Feed Entries', value: String(reportData.feed.length) },
          { label: 'Feed Used', value: `${formatNumber(feedTotalKg)} kg` },
          { label: 'Feed Cost', value: formatCurrency(reportData.feed.reduce((sum, item) => sum + Number(item.feed_cost || 0), 0)) },
          { label: 'Farms Covered', value: String(reportData.farms.length) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'feed_type', title: 'Feed Type', width: 120 },
          { key: 'feed_quantity', title: 'Quantity (kg)', width: 120 },
          { key: 'feed_cost', title: 'Cost', width: 100 },
          { key: 'date_recorded', title: 'Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: reportData.feed,
        emptyText: 'No feed records found yet.',
      },
      mortality: {
        title: 'Mortality Report',
        summary: [
          { label: 'Mortality Entries', value: String(reportData.mortality.length) },
          { label: 'Total Dead', value: String(mortalityTotal) },
          { label: 'Average per Entry', value: reportData.mortality.length ? formatNumber(mortalityTotal / reportData.mortality.length) : formatNumber(0) },
          { label: 'Farms Covered', value: String(reportData.farms.length) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'number_dead', title: 'Number Dead', width: 110 },
          { key: 'cause_of_death', title: 'Cause', width: 180 },
          { key: 'date_recorded', title: 'Date', width: 120 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: reportData.mortality,
        emptyText: 'No mortality records found yet.',
      },
      vaccinations: {
        title: 'Vaccination Report',
        summary: [
          { label: 'Vaccination Entries', value: String(reportData.vaccinations.length) },
          { label: 'Next Doses Tracked', value: String(dueVaccinations) },
          { label: 'Farms Covered', value: String(reportData.farms.length) },
          { label: 'Batches Covered', value: String(new Set(reportData.vaccinations.map(item => item.batch_id)).size) },
        ],
        columns: [
          { key: 'farm_name', title: 'Farm', width: 130 },
          { key: 'batch_id', title: 'Batch ID', width: 90 },
          { key: 'vaccine_name', title: 'Vaccine', width: 140 },
          { key: 'vaccination_date', title: 'Given On', width: 120 },
          { key: 'next_due_date', title: 'Next Due', width: 120 },
          { key: 'notes', title: 'Notes', width: 180 },
          { key: 'batch_status', title: 'Batch Status', width: 120 },
        ],
        data: reportData.vaccinations,
        emptyText: 'No vaccination records found yet.',
      },
    };
  }, [reportData]);

  const currentReport = reportConfig[activeReport];

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Reports</Text>
      <View style={styles.reportPicker}>
        {REPORT_TYPES.map(reportType => {
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

      <View style={styles.reportCard}>
        <Text style={styles.sectionTitle}>{currentReport.title}</Text>

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

              if (['amount', 'feed_cost', 'price_per_bird', 'total_revenue', 'total_expenses'].includes(column.key)) {
                return <Text style={styles.cellText}>{formatCurrency(value)}</Text>;
              }

              if (['feed_quantity', 'feed_used'].includes(column.key)) {
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
  reportPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
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
