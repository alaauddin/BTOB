import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { BRAND } from '../theme/brand';

/**
 * AppText - A themed Text component that automatically applies Cairo typography.
 * Maps standard fontWeight values to the correct Cairo font family.
 */
const AppText = ({ style, children, ...props }) => {
    const flattenedStyle = StyleSheet.flatten(style) || {};

    // Determine the correct Cairo font family based on fontWeight
    let fontFamily = BRAND.typography.regular;
    const weight = String(flattenedStyle.fontWeight || 'normal');

    if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
        fontFamily = BRAND.typography.bold;
    } else if (weight === '600') {
        fontFamily = BRAND.typography.semiBold;
    } else if (weight === '500') {
        fontFamily = BRAND.typography.medium;
    }

    // Apply the font family and allow the rest of the style to override if needed
    // (Note: we use fontFamily as the default, but if the style explicitly has a different fontFamily, it will win)
    const combinedStyle = [
        { fontFamily },
        style
    ];

    return (
        <RNText {...props} style={combinedStyle}>
            {children}
        </RNText>
    );
};

export default AppText;
