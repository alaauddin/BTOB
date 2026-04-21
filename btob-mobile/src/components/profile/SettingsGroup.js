import React from 'react';
import { View, Text, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from '../../theme/profileStyles';

/**
 * SettingsGroup.js
 * 
 * A styled card container for grouping related settings.
 * Supports entrance animations via the fadeAnim prop.
 */
const SettingsGroup = ({ title, icon, iconColor, children, headerAction, fadeAnim }) => (
  <Animated.View 
    style={[
      styles.groupCard, 
      fadeAnim ? { 
        opacity: fadeAnim, 
        transform: [{ 
          translateY: fadeAnim.interpolate({ 
            inputRange: [0, 1], 
            outputRange: [30, 0] 
          }) 
        }] 
      } : {} 
    ]}
  >
    <View style={styles.groupHeader}>
      <View style={styles.groupHeaderTitle}>
        <View style={[styles.groupIconWrap, { backgroundColor: iconColor + '10' }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.groupHeaderText}>{title}</Text>
      </View>
      {headerAction}
    </View>
    <View style={styles.groupBody}>
      {children}
    </View>
  </Animated.View>
);

export default SettingsGroup;
