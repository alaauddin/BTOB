import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BRAND } from '../../theme/brand';
import styles from './styles';
import Text from '../AppText';

const PlanCard = ({ plan, isSelected, onSelect }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.planCard, 
        isSelected && { 
          borderColor: BRAND.colors.primary, 
          borderWidth: 2, 
          backgroundColor: '#F0F9FF' 
        }
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.planHeader}>
        <View style={[
          styles.planIconWrap, 
          { backgroundColor: isSelected ? BRAND.colors.primary : BRAND.colors.slate[100] }
        ]}>
          <Feather name="package" size={20} color={isSelected ? BRAND.colors.white : BRAND.colors.slate[500]} />
        </View>

        <View style={styles.planTitleWrap}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>
            {parseFloat(plan.price).toLocaleString()} {plan.currency || 'د.ك'} / {plan.duration_days} يوم
          </Text>
        </View>

        {isSelected && (
          <View style={[styles.checkCircle, { backgroundColor: BRAND.colors.primary }]}>
            <Feather name="check" size={14} color={BRAND.colors.white} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PlanCard;
