import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (_) {
  Haptics = null;
}

const hapticStyles = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

export default function AnimatedPressable({
  children,
  style,
  onPress,
  scaleTo = 0.97,
  haptic,
  disabled,
  ...props
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  const handlePress = (event) => {
    if (haptic && Haptics?.impactAsync) {
      const styleName = hapticStyles[haptic] || 'Light';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.[styleName]).catch(() => {});
    }
    onPress?.(event);
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
