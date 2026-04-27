import React from 'react';
import { View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';
import Text from '../AppText';
import { BRAND } from '../../theme/brand';

/**
 * DeviceMockup.js
 * 
 * A visual preview component that mocks a flagship smartphone UI.
 */
const DeviceMockup = ({ formData, primaryColor }) => {
  const pColor = formData?.primary_color || primaryColor || THEME.colors.primary;
  const sColor = formData?.secondary_color || '#FFF';
  const aColor = formData?.accent_color || pColor;
  const tColor = formData?.footer_text_color || '#1E293B';
  const nColor = formData?.navbar_color || '#FFF';
  const ntColor = formData?.navbar_text_color || '#000';
  const fColor = formData?.footer_color || '#F8FAFC';

  return (
    <View style={styles.mockupFrame}>
      <View style={styles.mockupBezel}>
        <View style={styles.mockupStatusBar}>
           <View style={styles.mockupIsland} />
        </View>
        <View style={[styles.mockupNav, { backgroundColor: nColor }]}>
           <View style={styles.mockupNavItems}>
              <Feather name="menu" size={14} color={ntColor} />
              <Text style={[styles.mockupBrandName, { color: ntColor }]}>
                {formData?.name ? (formData.name.length > 12 ? formData.name.substring(0, 10) + '..' : formData.name) : 'متجرك'}
              </Text>
              <Feather name="shopping-bag" size={14} color={ntColor} />
           </View>
        </View>
        <View style={[styles.mockupContent, { backgroundColor: sColor }]}>
           <View style={[styles.mockupHeroMock, { backgroundColor: aColor + '15' }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={32} color={aColor} />
              <Text style={{ fontSize: 9, fontFamily: BRAND.typography.extraBold, color: aColor, marginTop: 4 }}>عرض خاص</Text>
           </View>
           <View style={{ gap: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontFamily: BRAND.typography.extraBold, color: tColor }}>احدث المنتجات</Text>
              <View style={[styles.mockupBtn, { backgroundColor: pColor }]}>
                <Text style={styles.mockupBtnText}>شراء الآن</Text>
              </View>
           </View>
        </View>
        <View style={[styles.mockupFooter, { backgroundColor: fColor }]}>
           <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
              <Feather name="home" size={12} color={tColor} />
              <Feather name="grid" size={12} color={tColor} />
              <Feather name="user" size={12} color={tColor} />
           </View>
        </View>
      </View>
    </View>
  );
};

export default DeviceMockup;
