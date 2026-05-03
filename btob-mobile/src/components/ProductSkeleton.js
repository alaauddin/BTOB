import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function ProductSkeleton() {
    const shimmerValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startShimmer = () => {
            shimmerValue.setValue(0);
            Animated.loop(
                Animated.timing(shimmerValue, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                })
            ).start();
        };
        startShimmer();
    }, []);

    const translateX = shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-CARD_WIDTH, CARD_WIDTH],
    });

    return (
        <View style={styles.card}>
            <View style={styles.imagePlaceholder}>
                <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]}>
                    <LinearGradient
                        colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </View>
            <View style={styles.info}>
                <View style={styles.titleLine} />
                <View style={styles.priceLine} />
                <View style={styles.buttonLine} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#FFF',
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    imagePlaceholder: {
        width: '100%',
        height: CARD_WIDTH,
        backgroundColor: '#F1F5F9',
    },
    shimmer: {
        ...StyleSheet.absoluteFillObject,
        width: CARD_WIDTH,
    },
    info: {
        padding: 12,
    },
    titleLine: {
        width: '80%',
        height: 12,
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        marginBottom: 8,
    },
    priceLine: {
        width: '40%',
        height: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 5,
        marginBottom: 12,
    },
    buttonLine: {
        width: '100%',
        height: 32,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
});
