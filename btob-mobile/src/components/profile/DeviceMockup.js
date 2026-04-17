import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';

/**
 * DeviceMockup.js
 * 
 * A visual preview component that mocks a flagship smartphone UI.
 */
const DeviceMockup = ({ formData, primaryColor }) => (
  <View style={styles.mockupFrame}>
    <View style={styles.mockupBezel}>
      <View style={styles.mockupStatusBar}>
         <View style={styles.mockupIsland} />
      </View>
      <View style={[styles.mockupNav, { backgroundColor: formData?.navbar_color || '#FFF' }]}>
         <View style={styles.mockupNavItems}>
            <Feather name="menu" size={12} color={formData?.navbar_text_color || '#000'} />
            <Text style={[styles.mockupBrandName, { color: formData?.navbar_text_color || '#000' }]}>{formData?.name || 'Store'}</Text>
            <Feather name="shopping-bag" size={12} color={formData?.navbar_text_color || '#000'} />
         </View>
      </View>
      <View style={styles.mockupContent}>
         <View style={[styles.mockupHeroMock, { backgroundColor: (primaryColor || THEME.colors.primary) + '10' }]}>
            <Feather name="sparkles" size={24} color={primaryColor || THEME.colors.primary} />
         </View>
         <View style={[styles.mockupBtn, { backgroundColor: primaryColor || THEME.colors.primary }]}>
            <Text style={styles.mockupBtnText}>إضافة للسلة</Text>
         </View>
      </View>
      <View style={[styles.mockupFooter, { backgroundColor: formData?.footer_color || '#F8FAFC' }]} />
    </View>
  </View>
);

export default DeviceMockup;
