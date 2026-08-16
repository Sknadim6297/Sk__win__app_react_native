import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Centered dialog with dark overlay + fade/scale animation.
 */
export default function CenterDialog({
  visible,
  onClose,
  children,
  dismissOnOverlay = true,
  maxWidth = 400,
  style,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
    }
  }, [visible, opacity, scale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose || (() => {})}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.root}>
          <TouchableWithoutFeedback
            onPress={dismissOnOverlay && onClose ? onClose : undefined}
            disabled={!dismissOnOverlay || !onClose}
          >
            <Animated.View style={[styles.overlay, { opacity }]} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.card,
              {
                width: Math.min(SCREEN_W - 40, maxWidth),
                opacity,
                transform: [{ scale }],
              },
              style,
            ]}
          >
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 16, 0.78)',
  },
  card: {
    backgroundColor: '#151D36',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.28)',
    maxHeight: '88%',
    zIndex: 2,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
});
