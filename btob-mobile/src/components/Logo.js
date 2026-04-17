import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/**
 * Standard Logo component for the Rawaj Platform.
 * Supports different sizes and variants.
 */
const Logo = ({ size = 120, style, white = false }) => {
    // We can add logic here to switch to a white version of the logo if needed
    // For now we use the standard logo.png
    const logoSource = require('../../assets/images/logo.png');

    return (
        <View style={[styles.container, { width: size, height: size * 0.4 }, style]}>
            <Image
                source={logoSource}
                style={styles.image}
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
    image: {
        width: '100%',
        height: '100%',
    },
});

export default Logo;
