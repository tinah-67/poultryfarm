import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DataTable({
  columns,
  data,
  keyExtractor,
  renderCell,
  emptyText = 'No records found.',
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          {columns.map((column) => (
            <View key={column.key} style={[styles.cell, styles.headerCell, { width: column.width || 140 }]}>
              <Text style={styles.headerText}>{column.title}</Text>
            </View>
          ))}
        </View>

        {data.length ? (
          data.map((item, index) => (
            <View
              key={keyExtractor(item, index)}
              style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
            >
              {columns.map((column) => (
                <View key={column.key} style={[styles.cell, { width: column.width || 140 }]}>
                  {renderCell(item, column, index)}
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d5dce5',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  headerRow: {
    backgroundColor: '#0f172a',
  },
  evenRow: {
    backgroundColor: '#f8fafc',
  },
  oddRow: {
    backgroundColor: '#ffffff',
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d5dce5',
    justifyContent: 'center',
  },
  headerCell: {
    borderBottomColor: '#0f172a',
  },
  headerText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
  },
});
