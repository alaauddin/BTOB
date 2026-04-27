import React from 'react';
import { View, Switch, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';
import Text from '../AppText';

/**
 * PremiumToggle.js
 * 
 * A styled switch for boolean settings in the Profile screen.
 */
const PremiumToggle = ({ label, icon, value, onValueChange, color }) => (
  <View style={styles.premToggleRow}>
    <View style={styles.premToggleLabelSide}>
      <View style={styles.tinyIconBox}>
        <Feather name={icon} size={16} color={value ? (color || THEME.colors.primary) : THEME.colors.slate[400]} />
      </View>
      <Text style={[styles.premToggleLabel, value && { color: THEME.colors.slate[900] }]}>{label}</Text>
    </View>
    <Switch 
      value={Boolean(value)} 
      onValueChange={onValueChange} 
      trackColor={{ 
        true: (color || THEME.colors.primary) + '80', 
        false: THEME.colors.slate[200] 
      }}
      thumbColor={value ? (color || THEME.colors.primary) : '#FFF'}
      ios_backgroundColor={THEME.colors.slate[200]}
      style={Platform.OS === 'ios' ? { transform: [{ scale: 0.8 }] } : {}}
    />
  </View>
);

export default PremiumToggle;
