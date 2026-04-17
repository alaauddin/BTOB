import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';

/**
 * PremiumInput.js
 * 
 * A styled text input for the Profile experience with focus states.
 */
const PremiumInput = ({ label, icon, value, onChangeText, keyboardType, multiline, editable = true, flex, isColor }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <View style={[styles.premInputWrap, flex ? { flex } : {}]}>
      {label && <Text style={styles.premInputLabel}>{label}</Text>}
      <View style={[
        styles.premInputInner, 
        !editable && styles.premInputDisabled,
        isFocused && { borderColor: THEME.colors.primary, backgroundColor: '#FFF' }
      ]}>
        {icon && (
          <Feather 
            name={icon} 
            size={15} 
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlign="right"
        />
      </View>
    </View>
  );
};

export default PremiumInput;
