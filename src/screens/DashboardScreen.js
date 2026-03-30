import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function DashboardScreen({ navigation, route }) {
  const userId = route?.params?.userId;

  console.log("DASHBOARD userId:", userId);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Poultry Farm Dashboard</Text>

      {/* FARM */}
      <TouchableOpacity style={styles.card} onPress={() => {
        console.log("Navigating to Farm with userId:", userId);
        navigation.navigate('Farm', { userId });
      }}>
        <Text style={styles.cardText}>Farm Management</Text>
      </TouchableOpacity>

      {/* BATCH */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ViewBatches')}>
        <Text style={styles.cardText}>Batch Management</Text>
      </TouchableOpacity>

      {/* FEED */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Feed')}>
        <Text style={styles.cardText}>Feed Management</Text>
      </TouchableOpacity>

      {/* MORTALITY */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Mortality')}>
        <Text style={styles.cardText}>Mortality Management</Text>
      </TouchableOpacity>

      {/* REPORTS */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Performance')}>
        <Text style={styles.cardText}>Batch Performance</Text>
      </TouchableOpacity>

      {/* OPTIONAL */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Notifications')}>
        <Text style={styles.cardText}>Notifications</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    padding: 20,
    backgroundColor: '#4CAF50',
    marginVertical: 8,
    borderRadius: 10,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});