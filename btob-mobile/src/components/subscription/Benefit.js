import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BRAND } from '../../theme/brand';
import styles from './styles';

const Benefit = ({ item, isIncluded = true }) => (
  <View style={styles.benefitRow}>
    <Feather 
      name={isIncluded ? "check" : "x"} 
      size={14} 
      color={isIncluded ? BRAND.colors.success : BRAND.colors.danger} 
    />
    <Text style={[
      styles.benefitText, 
      !isIncluded && { textDecorationLine: 'line-through', color: BRAND.colors.slate[300] }
    ]}>
      {item}
    </Text>
  </View>
);

export default Benefit;
