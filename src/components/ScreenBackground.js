import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

// Provides a shared neutral farm-style background and dark overlay used by app screens.
export default function ScreenBackground({
  children,
  scroll = false,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  refreshControl,
}) {
  // Uses a scroll view when the screen content may be taller than the viewport.
  if (scroll) {
    return (
      <View style={styles.background}>
        <View style={styles.overlay}>
          <ScrollView
            style={styles.fill}
            contentContainerStyle={[styles.content, contentContainerStyle]}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Uses a fixed content container for simple non-scrolling screens.
  return (
    <View style={styles.background}>
      <View style={styles.overlay}>
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Covers the screen with a neutral farm-themed background and readable overlay.
  background: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
