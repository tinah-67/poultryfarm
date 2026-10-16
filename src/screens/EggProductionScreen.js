import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getEggAvailabilityByBatchId,
  getEggBreakageRecordsByBatchId,
  getEggCollectionsByBatchId,
} from '../database/db';
import ScreenBackground from '../components/ScreenBackground';

// Shows flock totals and opens the four egg production workflows.
export default function EggProductionScreen({ route, navigation }) {
  const batchId = route?.params?.batchId;
  const userId = route?.params?.userId;
  const [summary, setSummary] = useState({
    collected: 0,
    brokenAtCollection: 0,
    brokenLater: 0,
    available: 0,
  });

  const loadSummary = useCallback(() => {
    if (!batchId) {
      setSummary({ collected: 0, brokenAtCollection: 0, brokenLater: 0, available: 0 });
      return;
    }

    getEggCollectionsByBatchId(batchId, records => {
      const collectionRecords = records || [];
      setSummary(current => ({
        ...current,
        collected: collectionRecords.reduce((sum, record) => sum + Number(record.eggs_collected || 0), 0),
        brokenAtCollection: collectionRecords.reduce((sum, record) => sum + Number(record.eggs_broken || 0), 0),
      }));
    });
    getEggBreakageRecordsByBatchId(batchId, records => {
      setSummary(current => ({
        ...current,
        brokenLater: (records || []).reduce((sum, record) => sum + Number(record.eggs_broken || 0), 0),
      }));
    });
    getEggAvailabilityByBatchId(batchId, available => {
      setSummary(current => ({ ...current, available }));
    });
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary]),
  );

  const summaryItems = [
    { label: 'Collected', value: summary.collected },
    { label: 'Broken', value: summary.brokenAtCollection + summary.brokenLater },
    { label: 'Available', value: summary.available },
  ];

  const actions = [
    {
      number: '01',
      title: 'Record egg collection',
      description: 'Log a collection and any eggs broken during collection.',
      screen: 'RecordEggCollection',
      tint: '#dcfce7',
      accent: '#15803d',
    },
    {
      number: '02',
      title: 'Record later breakage',
      description: 'Track eggs damaged after collection.',
      screen: 'RecordEggBreakage',
      tint: '#ffe4e6',
      accent: '#be123c',
    },
    {
      number: '03',
      title: 'Collection history',
      description: 'Review collection totals and records.',
      screen: 'ViewEggCollections',
      tint: '#dbeafe',
      accent: '#1d4ed8',
    },
    {
      number: '04',
      title: 'Breakage history',
      description: 'Review breakage records for this flock.',
      screen: 'ViewEggBreakage',
      tint: '#fef3c7',
      accent: '#b45309',
    },
  ];

  return (
    <ScreenBackground scroll contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>FLOCK RECORDS</Text>
          <Text style={styles.title}>Egg production</Text>
          <Text style={styles.subtitle}>Production and inventory at a glance</Text>
        </View>
        <View style={styles.batchBadge}>
          <Text style={styles.batchLabel}>BATCH</Text>
          <Text style={styles.batchValue}>{batchId ?? 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.summaryPanel}>
        <Text style={styles.panelLabel}>CURRENT EGG TOTALS</Text>
        <View style={styles.summaryRow}>
          {summaryItems.map(item => (
            <View key={item.label} style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Production tools</Text>
          <Text style={styles.sectionSubtitle}>Choose a task for this flock</Text>
        </View>
        <Text style={styles.actionCount}>4 TASKS</Text>
      </View>

      <View style={styles.actions}>
        {actions.map(action => (
          <TouchableOpacity
            key={action.screen}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.screen, { batchId, userId })}
            accessibilityRole="button"
            accessibilityHint={action.description}
            activeOpacity={0.82}
          >
            <View style={[styles.actionNumber, { backgroundColor: action.tint }]}>
              <Text style={[styles.actionNumberText, { color: action.accent }]}>
                {action.number}
              </Text>
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            <Text style={styles.actionArrow}>&gt;</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: '#bbf7d0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#e2e8f0', fontSize: 13, marginTop: 5 },
  batchBadge: {
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  batchLabel: { color: '#cbd5e1', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  batchValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 3 },
  summaryPanel: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  panelLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  summaryValue: { color: '#0f172a', fontSize: 21, fontWeight: '800' },
  summaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', marginTop: 3 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { color: '#cbd5e1', fontSize: 12, marginTop: 3 },
  actionCount: { color: '#dcfce7', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  actions: { gap: 11 },
  actionCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#020617',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionNumber: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionNumberText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  actionCopy: { flex: 1, gap: 4 },
  actionTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  actionDescription: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  actionArrow: { color: '#94a3b8', fontSize: 22, fontWeight: '600', paddingLeft: 4 },
});
