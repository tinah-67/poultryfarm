import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function BatchDetailsScreen({ route, navigation }) {
    const batchId = route?.params?.batchId;
    const farmName = route?.params?.farmName;

    return (
        <View style={styles.container}>
        <Text style={styles.title}>Batch Details</Text>
        <Text>Batch ID: {batchId}</Text>
        {farmName ? <Text>Farm: {farmName}</Text> : null}

        <Button
            title="Record Feed"
            onPress={() => navigation.navigate("Feed", { batchId })}
        />

        <Button
            title="Record Mortality"
            onPress={() => navigation.navigate("Mortality", { batchId })}
        />

        <Button
            title="Record Vaccination"
            onPress={() => navigation.navigate("Vaccination", { batchId })}
        />

        <Button
            title="Record Expense"
            onPress={() => navigation.navigate("Expense", { batchId })}
        />

        <Button
            title="Record Sales"
            onPress={() => navigation.navigate("Sales", { batchId })}
        />
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 20, marginBottom: 20 }
});
