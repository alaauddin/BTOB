import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';

/**
 * PremiumToggle.js
 * 
 * A styled switch for boolean settings in the Profile screen.
 */
const PremiumToggle = ({ label, icon, value, onValueChange, color }) => (
  <View style={styles.premToggleRow}>
    <View style={styles.premToggleLabelSide}>
      <View style={styles.tinyIconBox}>
        <Feather name={icon} size={14} color={THEME.colors.slate[400]} />
      </View>
      <Text style={styles.premToggleLabel}>{label}</Text>
    </View>
    <Switch 
      value={Boolean(value)} 
      onValueChange={onValueChange} 
      trackColor={{ true: color || THEME.colors.primary, false: THEME.colors.slate[200] }}
      thumbColor="#FFF"
    />
  </View>
);

export default PremiumToggle;
