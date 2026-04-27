import { StyleSheet, Platform, Dimensions } from 'react-native';
import { BRAND } from '../../theme/brand';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const getCheckoutStyles = (themeRaw) => {
    const theme = themeRaw || {};
    const primaryColor = theme.primary || BRAND.colors.primary;
    
    return StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            justifyContent: "flex-end",
        },
        keyboardView: { width: "100%", flex: 1, justifyContent: "flex-end" },
        modalContent: {
            height: "92%",
            backgroundColor: theme.bg || "#F8FAFC",
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            width: "100%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -15 },
            shadowOpacity: 0.1,
            shadowRadius: 30,
            elevation: 25,
            overflow: 'hidden'
        },
        blurHeader: {
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 140,
            zIndex: 10,
        },
        dragIndicator: {
            width: 36, height: 4,
            backgroundColor: "#E2E8F0",
            borderRadius: 2,
            alignSelf: "center",
            marginTop: 12,
        },
        closeButton: {
            position: "absolute", top: 20, end: 20, zIndex: 100,
            width: 40, height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.8)',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
        },

        /* Header */
        headerArea: {
            paddingHorizontal: 24, paddingTop: 20, marginBottom: 15,
            zIndex: 20,
        },
        modalTitle: {
            fontSize: 26, 
            fontFamily: BRAND.typography.extraBold,
            color: theme.text || "#0F172A",
            textAlign: 'auto',
        },
        modalSubtitle: {
            fontSize: 14, 
            fontFamily: BRAND.typography.medium,
            color: theme.textMuted || "#64748B", 
            marginTop: 4,
            textAlign: 'auto',
        },

        /* Tabs */
        tabsWrapper: {
            zIndex: 50,
            paddingHorizontal: 24,
            marginBottom: 20,
        },
        tabsContainer: {
            flexDirection: "row",
            backgroundColor: "#F1F5F9",
            borderRadius: 16, 
            padding: 5,
            borderWidth: 1,
            borderColor: '#E2E8F0',
        },
        tabButton: {
            flex: 1, 
            flexDirection: "row",
            alignItems: "center", 
            justifyContent: "center",
            paddingVertical: 10, 
            borderRadius: 12, 
            gap: 8,
        },
        activeTabButton: {
            backgroundColor: "#FFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08, 
            shadowRadius: 8, 
            elevation: 3,
        },
        tabText: { 
            fontSize: 14, 
            fontFamily: BRAND.typography.bold,
            color: "#94A3B8" 
        },
        activeTabText: { 
            color: primaryColor,
        },

        /* Scroll Area */
        scrollArea: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 10,
            paddingBottom: Platform.OS === "android" ? 180 : 150,
        },

        /* Map Card */
        mapContainer: {
            height: 200, 
            borderRadius: 24,
            overflow: "hidden", 
            marginBottom: 20,
            backgroundColor: '#FFF',
            borderWidth: 1,
            borderColor: '#F1F5F9',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 15,
            elevation: 5,
        },
        mapWebView: {
            flex: 1,
        },
        recenterBtn: {
            position: "absolute", bottom: 15, end: 15,
            backgroundColor: "#FFF",
            width: 48, height: 48, borderRadius: 24,
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, 
            shadowRadius: 10, 
            elevation: 6,
        },
        mapOverlayLabel: {
            position: "absolute", top: 15, end: 15,
            backgroundColor: "rgba(255,255,255,0.9)",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15, 
            paddingVertical: 8,
            borderRadius: 20, 
            gap: 8,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
        },
        mapOverlayText: {
            fontSize: 12, 
            fontFamily: BRAND.typography.bold,
            color: "#1E293B",
        },

        /* Input Styles */
        inputGroup: { marginBottom: 20 },
        inputLabel: {
            fontSize: 14, 
            fontFamily: BRAND.typography.bold,
            color: "#475569",
            marginBottom: 10,
            textAlign: 'auto',
        },
        inputWrapper: {
            flexDirection: "row", 
            alignItems: "center",
            backgroundColor: "#FFF", 
            borderRadius: 16,
            borderWidth: 1.5, 
            borderColor: "#F1F5F9", 
            overflow: "hidden",
            height: 56,
        },
        inputWrapperFocused: {
            borderColor: primaryColor,
            backgroundColor: primaryColor + '05',
        },
        standardInput: {
            flex: 1, 
            height: '100%', 
            paddingHorizontal: 16,
            fontSize: 15, 
            fontFamily: BRAND.typography.medium,
            color: "#0F172A",
            textAlign: 'auto',
        },
        textArea: { 
            height: 120, 
            textAlignVertical: "top", 
            paddingTop: 16 
        },
        inputIcon: {
            paddingHorizontal: 16,
        },

        /* Saved Card */
        savedCard: {
            backgroundColor: "#FFF", 
            borderRadius: 24, 
            padding: 20,
            marginBottom: 24, 
            borderWidth: 1, 
            borderColor: "#F1F5F9",
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.03, 
            shadowRadius: 20, 
            elevation: 2,
        },
        savedCardHeader: {
            flexDirection: "row", 
            alignItems: "center", 
            marginBottom: 16,
        },
        iconCircle: {
            width: 52, height: 52, borderRadius: 16,
            backgroundColor: primaryColor + "10",
            alignItems: "center", justifyContent: "center",
        },
        savedTextColumn: { 
            flex: 1,
            marginEnd: 16,
        },
        savedCardTitle: {
            fontSize: 12, 
            fontFamily: BRAND.typography.bold,
            color: primaryColor,
            marginBottom: 2,
            textAlign: 'auto',
        },
        savedAddressText: {
            fontSize: 17, 
            fontFamily: BRAND.typography.extraBold,
            color: "#0F172A",
            lineHeight: 26,
            textAlign: 'auto',
        },

        /* Payment Section */
        paymentGrid: { 
            flexDirection: "row", 
            flexWrap: "wrap", 
            gap: 12, 
            marginBottom: 24 
        },
        paymentItem: {
            flex: 1,
            minWidth: '45%',
            padding: 18, 
            borderRadius: 20,
            backgroundColor: "#FFF", 
            borderWidth: 1.5, 
            borderColor: "#F1F5F9",
            alignItems: "center", 
            justifyContent: "center", 
            gap: 12,
        },
        selectedPaymentItem: { 
            borderColor: primaryColor, 
            backgroundColor: primaryColor + "08",
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
        },
        paymentItemText: { 
            fontSize: 14, 
            fontFamily: BRAND.typography.bold,
            color: "#64748B", 
            textAlign: "center" 
        },

        /* Stepper */
        stepperContainer: {
            flexDirection: "row", 
            alignItems: "center", 
            justifyContent: "center",
            marginTop: 15, 
            marginBottom: 10,
        },
        stepCircle: {
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: "#F1F5F9", 
            justifyContent: "center", 
            alignItems: "center",
        },
        activeStep: { 
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        stepConnector: {
            width: 40, height: 2, 
            backgroundColor: "#F1F5F9", 
            marginHorizontal: 8
        },

        /* Footer */
        footerArea: {
            paddingHorizontal: 24, 
            paddingTop: 20,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            backgroundColor: "#FFF",
            borderTopWidth: 1, 
            borderColor: "#F1F5F9",
        },
        submitBtn: {
            height: 64, 
            backgroundColor: primaryColor,
            borderRadius: 20, 
            justifyContent: "center", 
            alignItems: "center",
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25, 
            shadowRadius: 15, 
            elevation: 8,
        },
        submitBtnText: { 
            fontSize: 18, 
            fontFamily: BRAND.typography.extraBold,
            color: "#FFF" 
        },
        /* Missing Styles */
        coordBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            gap: 6,
        },
        coordText: {
            fontSize: 13,
            fontFamily: BRAND.typography.bold,
        },
        requiredStar: {
            color: '#ef4444',
        },
        savedDetailRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
            gap: 10,
        },
        savedPhoneText: {
            fontSize: 15,
            fontFamily: BRAND.typography.bold,
            color: '#475569',
            textAlign: 'auto',
        },
    });
};

export default getCheckoutStyles({});
