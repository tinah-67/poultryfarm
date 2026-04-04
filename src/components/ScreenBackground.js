import React from 'react';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';

export default function ScreenBackground({
  children,
  scroll = false,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  refreshControl,
}) {
  if (scroll) {
    return (
      <ImageBackground
        source={require('../Broilers-Chickens.webp')}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
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
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../Broilers-Chickens.webp')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    resizeMode: 'cover',
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
