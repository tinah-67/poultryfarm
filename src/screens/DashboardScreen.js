import React from 'react';
import { Alert, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

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
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ViewFarms', { userId })}
      >
        <Text style={styles.cardText}>Batch Management</Text>
      </TouchableOpacity>

      {/* FEED */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => Alert.alert('Select a batch first', 'Open a farm, then choose a batch to manage feed records.')}
      >
        <Text style={styles.cardText}>Feed Management</Text>
      </TouchableOpacity>

      {/* MORTALITY */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => Alert.alert('Coming soon', 'Mortality management screen has not been wired yet.')}
      >
        <Text style={styles.cardText}>Mortality Management</Text>
      </TouchableOpacity>

      {/* REPORTS */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => Alert.alert('Coming soon', 'Batch performance reporting screen has not been wired yet.')}
      >
        <Text style={styles.cardText}>Batch Performance</Text>
      </TouchableOpacity>

      {/* OPTIONAL */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => Alert.alert('Coming soon', 'Notifications screen has not been wired yet.')}
      >
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
