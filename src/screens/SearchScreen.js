import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

// Defines the searchable record groups shown as filter chips.
const SEARCH_TYPES = ['all', 'farms', 'batches', 'sales', 'expenses', 'feed', 'mortality', 'vaccinations'];

// Combines searchable values into one lowercase string for simple matching.
const buildSearchText = values =>
  values
    .filter(value => value !== null && value !== undefined)
    .map(value => String(value).toLowerCase())
    .join(' ');

// Provides cross-module search across farms, batches, and batch records.
export default function SearchScreen({ route }) {
  // Stores the query, selected type, refresh state, and indexed records.
  const userId = route?.params?.userId;
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [records, setRecords] = useState({
    farms: [],
    batches: [],
    sales: [],
    expenses: [],
    feed: [],
    mortality: [],
    vaccinations: [],
  });

  // Loads accessible data and flattens it into search result records.
  const loadSearchData = useCallback((done) => {
    if (!userId) {
      setRecords({
        farms: [],
        batches: [],
        sales: [],
        expenses: [],
        feed: [],
        mortality: [],
        vaccinations: [],
      });
      done && done();
      return;
    }

    getAccessibleFarms(userId, farms => {
      const safeFarms = farms || [];

      if (safeFarms.length === 0) {
        setRecords({
          farms: [],
          batches: [],
          sales: [],
          expenses: [],
          feed: [],
          mortality: [],
          vaccinations: [],
        });
        done && done();
        return;
      }

      const nextRecords = {
        farms: safeFarms.map(farm => ({
          id: `farm-${farm.farm_id}`,
          type: 'farms',
          farmId: farm.farm_id,
          farmName: farm.farm_name,
          location: farm.location || 'N/A',
          searchText: buildSearchText([farm.farm_name, farm.location]),
        })),
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
              setRecords(nextRecords);
              done && done();
            }

            return;
          }

          let processedBatches = 0;

          safeBatches.forEach(batch => {
            nextRecords.batches.push({
              id: `batch-${batch.batch_id}`,
              type: 'batches',
              batchId: batch.batch_id,
              farmName: farm.farm_name,
              location: farm.location || 'N/A',
              breed: batch.breed || 'N/A',
              status: batch.status || 'active',
              startDate: batch.start_date || 'N/A',
              summary: `${batch.breed || 'Batch'} - ${batch.status || 'active'} - ${batch.start_date || 'No start date'}`,
              searchText: buildSearchText([
                farm.farm_name,
                farm.location,
                batch.breed,
                batch.status,
                batch.start_date,
                batch.batch_id,
              ]),
            });

            getFeedRecordsByBatchId(batch.batch_id, feedRecords => {
              getMortalityRecordsByBatchId(batch.batch_id, mortalityRecords => {
                getExpensesByBatchId(batch.batch_id, expenseRecords => {
                  getSalesByBatchId(batch.batch_id, saleRecords => {
                    getVaccinationRecordsByBatchId(batch.batch_id, vaccinationRecords => {
                      (feedRecords || []).forEach(item => {
                        nextRecords.feed.push({
                          id: `feed-${item.feed_id}`,
                          type: 'feed',
                          batchId: batch.batch_id,
                          farmName: farm.farm_name,
                          location: farm.location || 'N/A',
                          summary: `${item.feed_type || 'Feed'} - ${item.feed_quantity || 0} kg on ${item.date_recorded || 'N/A'}`,
                          searchText: buildSearchText([
                            farm.farm_name,
                            farm.location,
                            batch.breed,
                            item.feed_type,
                            item.feed_quantity,
                            item.date_recorded,
                          ]),
                        });
                      });

                      (mortalityRecords || []).forEach(item => {
                        nextRecords.mortality.push({
                          id: `mortality-${item.mortality_id}`,
                          type: 'mortality',
                          batchId: batch.batch_id,
                          farmName: farm.farm_name,
                          location: farm.location || 'N/A',
                          summary: `${item.number_dead || 0} dead - ${item.cause_of_death || 'No cause'} - ${item.date_recorded || 'N/A'}`,
                          searchText: buildSearchText([
                            farm.farm_name,
                            farm.location,
                            batch.breed,
                            item.number_dead,
                            item.cause_of_death,
                            item.date_recorded,
                          ]),
                        });
                      });

                      (expenseRecords || []).forEach(item => {
                        nextRecords.expenses.push({
                          id: `expense-${item.expense_id}`,
                          type: 'expenses',
                          batchId: batch.batch_id,
                          farmName: farm.farm_name,
                          location: farm.location || 'N/A',
                          summary: `${item.description || 'Expense'} - ${item.amount || 0} - ${item.expense_date || 'N/A'}`,
                          searchText: buildSearchText([
                            farm.farm_name,
                            farm.location,
                            batch.breed,
                            item.description,
                            item.amount,
                            item.expense_date,
                          ]),
                        });
                      });

                      (saleRecords || []).forEach(item => {
                        nextRecords.sales.push({
                          id: `sale-${item.sale_id}`,
                          type: 'sales',
                          batchId: batch.batch_id,
                          farmName: farm.farm_name,
                          location: farm.location || 'N/A',
                          summary: `${item.birds_sold || 0} birds sold - revenue ${item.total_revenue || 0}`,
                          searchText: buildSearchText([
                            farm.farm_name,
                            farm.location,
                            batch.breed,
                            item.birds_sold,
                            item.price_per_bird,
                            item.total_revenue,
                            item.sale_date,
                          ]),
                        });
                      });

                      (vaccinationRecords || []).forEach(item => {
                        nextRecords.vaccinations.push({
                          id: `vaccination-${item.vaccination_id}`,
                          type: 'vaccinations',
                          batchId: batch.batch_id,
                          farmName: farm.farm_name,
                          location: farm.location || 'N/A',
                          summary: `${item.vaccine_name || 'Vaccination'} - ${item.vaccination_date || 'N/A'} - next due ${item.next_due_date || 'N/A'}`,
                          searchText: buildSearchText([
                            farm.farm_name,
                            farm.location,
                            batch.breed,
                            item.vaccine_name,
                            item.vaccination_date,
                            item.next_due_date,
                            item.notes,
                          ]),
                        });
                      });

                      processedBatches += 1;

                      if (processedBatches === safeBatches.length) {
                        processedFarms += 1;

                        if (processedFarms === safeFarms.length) {
                          setRecords(nextRecords);
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

  // Rebuilds the search index whenever the screen receives focus.
  useFocusEffect(
    useCallback(() => {
      loadSearchData();
    }, [loadSearchData])
  );

  // Handles pull-to-refresh for search data.
  const handleRefresh = () => {
    setRefreshing(true);
    loadSearchData(() => setRefreshing(false));
  };

  // Combines every indexed record type for the "All" search mode.
  const allRecords = useMemo(() => ([
    ...records.farms,
    ...records.batches,
    ...records.sales,
    ...records.expenses,
    ...records.feed,
    ...records.mortality,
    ...records.vaccinations,
  ]), [records]);

  // Applies the selected type filter and text search.
  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = selectedType === 'all' ? allRecords : records[selectedType] || [];

    if (!normalizedQuery) {
      return source;
    }

    return source.filter(item => item.searchText.includes(normalizedQuery));
  }, [allRecords, query, records, selectedType]);

  // Defines the result table columns.
  const columns = [
    { key: 'type', title: 'Type', width: 130 },
    { key: 'farmName', title: 'Farm', width: 140 },
    { key: 'location', title: 'Location', width: 140 },
    { key: 'batchId', title: 'Batch', width: 90 },
    { key: 'summary', title: 'Result', width: 320 },
  ];

  // Summarizes total indexed records and currently visible results.
  const stats = {
    total: allRecords.length,
    shown: filteredResults.length,
  };

  return (
    <ScreenBackground
      scroll
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />}
    >
      <Text style={styles.title}>Search</Text>

      {/* Search input and type filters. */}
      <View style={styles.panel}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search farms, batches, sales, mortality, feed..."
          placeholderTextColor="#64748b"
          style={styles.input}
        />

        <View style={styles.filterRow}>
          {SEARCH_TYPES.map(type => {
            const isSelected = selectedType === type;
            const label = type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1);

            return (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, isSelected ? styles.filterChipSelected : null]}
                activeOpacity={0.85}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.filterChipText, isSelected ? styles.filterChipTextSelected : null]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Shows total indexed records and result count. */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>All Records</Text>
          <Text style={styles.summaryValue}>{stats.total}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Results Shown</Text>
          <Text style={styles.summaryValue}>{stats.shown}</Text>
        </View>
      </View>

      {/* Displays matching results in a reusable table. */}
      <View style={styles.resultsCard}>
        <DataTable
          columns={columns}
          data={filteredResults.map(item => ({
            ...item,
            type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
            batchId: item.batchId ?? 'N/A',
            farmName: item.farmName ?? 'N/A',
            location: item.location ?? 'N/A',
            summary: item.summary ?? `${item.farmName || 'Farm'} - ${item.location || 'N/A'}`,
          }))}
          keyExtractor={item => item.id}
          emptyText="No matching records found."
          renderCell={(item, column) => (
            <Text style={styles.cellText}>{String(item[column.key] ?? 'N/A')}</Text>
          )}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Search layout, filters, summary cards, and result table styles.
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  filterChipSelected: {
    backgroundColor: '#dcfce7',
  },
  filterChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#166534',
  },
  summaryRow: {
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
    marginBottom: 4,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
  },
  resultsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cellText: {
    color: '#0f172a',
    fontSize: 13,
  },
});
