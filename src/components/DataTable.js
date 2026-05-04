import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Renders a reusable horizontal table for report and record screens.
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
        {/* Builds the header row from the supplied column definitions. */}
        <View style={[styles.row, styles.headerRow]}>
          {columns.map((column) => (
            <View key={column.key} style={[styles.cell, styles.headerCell, { width: column.width || 140 }]}>
              <Text style={styles.headerText}>{column.title}</Text>
            </View>
          ))}
        </View>

        {/* Renders data rows when records exist, otherwise shows an empty state. */}
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
  // Keeps the table scrollable while filling narrow screens.
  scrollContent: {
    flexGrow: 1,
    minWidth: '100%',
  },
  table: {
    minWidth: '100%',
    borderWidth: 1,
    borderColor: '#d5dce5',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  // Shared row and cell styling for the table grid.
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
  // Header and empty-state styles.
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
