import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

const { width } = Dimensions.get('window');

const Toast = ({ visible, message, type = 'error', onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return styles.success;
      case 'warning':
        return styles.warning;
      case 'info':
        return styles.info;
      default:
        return styles.error;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return 'close-circle';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        getToastStyle(),
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={getIcon()} size={24} color={COLORS.white} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
    maxWidth: width - 40,
  },
  error: {
    backgroundColor: COLORS.error,
  },
  success: {
    backgroundColor: COLORS.success,
  },
  warning: {
    backgroundColor: '#FF9800',
  },
  info: {
    backgroundColor: COLORS.primary,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default Toast;
