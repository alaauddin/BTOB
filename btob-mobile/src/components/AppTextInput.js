import React from 'react';
import { TextInput as RNTextInput, StyleSheet } from 'react-native';
import { BRAND } from '../theme/brand';

/**
 * AppTextInput - A themed TextInput component that automatically applies Cairo typography.
 */
const AppTextInput = React.forwardRef(({ style, ...props }, ref) => {
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

    const combinedStyle = [
        { fontFamily, textAlign: 'right' },
        style
    ];

    return (
        <RNTextInput
            ref={ref}
            {...props}
            style={combinedStyle}
        />
    );
});

export default AppTextInput;
