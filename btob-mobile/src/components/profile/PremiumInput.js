import React, { useState } from 'react';
import { View, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';
import Text from '../AppText';
import TextInput from '../AppTextInput';

/**
 * PremiumInput.js
 * 
 * A styled text input for the Profile experience with focus states.
 */
const PremiumInput = ({ label, icon, value, onChangeText, keyboardType, multiline, editable = true, flex, isColor }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [focusAnim] = useState(new Animated.Value(0));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F1F5F9', THEME.colors.primary]
  });

  return (
    <View style={[styles.premInputWrap, flex ? { flex } : {}]}>
      {label && <Text style={styles.premInputLabel}>{label}</Text>}
      <Animated.View style={[
        styles.premInputInner, 
        !editable && styles.premInputDisabled,
        { borderColor }
      ]}>
        {icon && (
          <Feather 
            name={icon} 
            size={18} 
            color={isFocused ? THEME.colors.primary : THEME.colors.slate[400]} 
            style={styles.premInputIcon} 
          />
        )}
        
        {isColor && <View style={[styles.colorPreview, { backgroundColor: value || 'transparent' }]} />}
        
        <TextInput
          style={[styles.premInputField, multiline && styles.premInputMulti]}
          value={value || ''}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          placeholderTextColor={THEME.colors.slate[300]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="..."
          selectionColor={THEME.colors.primary}
        />
      </Animated.View>
    </View>
  );
};

export default PremiumInput;
