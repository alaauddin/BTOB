import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Standard Logo component for the Rawaj Platform.
 * Supports different sizes and variants.
 */
const Logo = ({ size = 120, style, white = false, variant = 'standard' }) => {
    const logoSource = require('../../assets/images/logo.png');

    if (variant === 'circle') {
        const circleSize = size;
        return (
            <View style={[
                styles.circleContainer, 
                { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }, 
                style
            ]}>
                <Image
                    source={logoSource}
                    style={{ width: circleSize * 0.6, height: circleSize * 0.6 }}
                    resizeMode="contain"
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { width: size, height: size * 0.4 }, style]}>
            <Image
                source={logoSource}
                style={[styles.image, white && { tintColor: '#FFFFFF' }]}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleContainer: {
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

export default Logo;
