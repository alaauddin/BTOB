import { StyleSheet, Platform, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const getCheckoutStyles = (themeRaw) => {
    const theme = themeRaw || {};
    return StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            justifyContent: "flex-end",
        },
        keyboardView: { width: "100%", flex: 1, justifyContent: "flex-end" },
        modalContent: {
            height: "92%", /* Safe, absolute percentage height for Android */
            backgroundColor: theme.bg || "#f8fafc",
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            width: "100%",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 20,
        },
        dragIndicator: {
            width: 40, height: 5,
            backgroundColor: theme.border || "#cbd5e1",
            borderRadius: 3,
            alignSelf: "center",
            marginTop: 12, marginBottom: 8,
        },
        closeButton: {
            position: "absolute", top: 20, end: 20, zIndex: 10,
            padding: 4,
        },

        /* Header */
        headerArea: {
            paddingHorizontal: 24, marginTop: 10, marginBottom: 20,
        },
        modalTitle: {
            fontSize: 24, fontWeight: "900", color: theme.text || "#0f172a",
        },
        modalSubtitle: {
            fontSize: 15, color: theme.textMuted || "#64748b", marginTop: 4,
        },

        /* Loading */
        loadingContainer: {
            alignItems: "center", justifyContent: "center", paddingVertical: 80,
        },
        loadingText: {
            marginTop: 16, color: "#64748b", fontSize: 16, fontWeight: "600",
        },

        /* Tabs */
        tabsWrapper: {
            zIndex: 50,
            backgroundColor: theme.bg || "#f8fafc",
            paddingBottom: 10,
        },
        tabsContainer: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginHorizontal: 24,
            backgroundColor: "#e2e8f0",
            borderRadius: 12, padding: 4,
        },
        tabButton: {
            flex: 1, flexDirection: "row",
            alignItems: "center", justifyContent: "center",
            paddingVertical: 12, borderRadius: 10, gap: 8,
        },
        activeTabButton: {
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
        },
        tabText: { fontSize: 15, fontWeight: "700", color: theme.textMuted || "#64748b" },
        activeTabText: { color: theme.primary || "#0ea5e9" },

        /* Error Box */
        errorBox: {
            flexDirection: "row",
            backgroundColor: "#fef2f2",
            marginHorizontal: 24, padding: 12,
            borderRadius: 12, alignItems: "center",
            borderWidth: 1, borderColor: "#fca5a5",
            marginBottom: 16, gap: 8,
        },
        errorTextCenter: {
            color: "#ef4444", fontSize: 14, fontWeight: "600",
            flex: 1,
        },

        /* Scrollable Area */
        scrollArea: {
            flex: 1, /* Crucial for Android ScrollView inside fixed height */
            paddingHorizontal: 24,
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: Platform.OS === "android" ? 180 : 150, /* Extra padding for Android Keyboard */
        },

        /* Map Elements */
        mapContainer: {
            height: 220, borderRadius: 20,
            overflow: "hidden", marginBottom: 16,
            borderWidth: 1, borderColor: "#e2e8f0",
            position: "relative",
        },
        mapWebView: {
            flex: 1, backgroundColor: "#e2e8f0",
        },
        recenterBtn: {
            position: "absolute", bottom: 12, end: 12,
            backgroundColor: "#fff",
            width: 42, height: 42, borderRadius: 21,
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
        },
        mapOverlayLabel: {
            position: "absolute", top: 12, end: 12,
            backgroundColor: "rgba(255,255,255,0.92)",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12, paddingVertical: 6,
            borderRadius: 20, gap: 6,
        },
        mapOverlayText: {
            fontSize: 12, color: theme.text || "#334155", fontWeight: "700",
        },
        coordBadge: {
            flexDirection: "row",
            alignItems: "center", alignSelf: "center",
            backgroundColor: (theme.primary || "#0ea5e9") + "15",
            paddingHorizontal: 14, paddingVertical: 8,
            borderRadius: 20, marginBottom: 16, gap: 6,
        },
        coordText: {
            fontSize: 13, color: theme.primary || "#0369a1", fontWeight: "700",
        },

        /* Saved Card Details */
        savedCard: {
            backgroundColor: "#fff", borderRadius: 20, padding: 20,
            marginBottom: 20, borderWidth: 1, borderColor: (theme.primary || "#0ea5e9") + "20",
            shadowColor: theme.primary || "#0ea5e9",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
        },
        savedCardHeader: {
            flexDirection: "row", alignItems: "center", marginBottom: 16,
        },
        iconCircle: {
            width: 50, height: 50, borderRadius: 25,
            backgroundColor: (theme.primary || "#0ea5e9") + "15",
            alignItems: "center", justifyContent: "center",
            marginStart: 16,
        },
        savedTextColumn: { flex: 1 },
        savedCardTitle: {
            fontSize: 14, fontWeight: "bold", color: theme.primary || "#0ea5e9",
            marginBottom: 4,
        },
        savedAddressText: {
            fontSize: 16, color: theme.text || "#0f172a", fontWeight: "800",
            lineHeight: 24,
        },
        savedDetailRow: {
            flexDirection: "row", alignItems: "center",
            justifyContent: "space-between",
            borderTopWidth: 1, borderTopColor: "#f1f5f9",
            paddingTop: 12, gap: 6,
        },
        savedPhoneText: { fontSize: 15, color: theme.text || "#334155", fontWeight: "700" },

        /* Input Fields */
        inputGroup: { marginBottom: 20 },
        inputLabel: {
            fontSize: 14, fontWeight: "700", color: theme.text || "#334155",
            marginBottom: 8,
        },
        requiredStar: { color: "#ef4444" },
        inputWrapper: {
            flexDirection: "row", alignItems: "center",
            backgroundColor: "#fff", borderRadius: 16,
            borderWidth: 1, borderColor: theme.border || "#cbd5e1", overflow: "hidden",
        },
        standardInput: {
            flex: 1, height: 56, paddingHorizontal: 16,
            fontSize: 15, color: theme.text || "#0f172a",
        },
        textArea: { height: 100, textAlignVertical: "top", paddingTop: 16 },
        inputIcon: {
            paddingHorizontal: 16, borderStartWidth: 1, borderStartColor: "#f1f5f9",
        },

        /* Footer Section */
        footerArea: {
            paddingHorizontal: 24, paddingTop: 16,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            backgroundColor: theme.footer || theme.bg || "#fff",
            borderTopWidth: 1, borderTopColor: "#f1f5f9",
        },
        submitBtn: {
            height: 60, backgroundColor: theme.primary || "#22c55e",
            borderRadius: 18, justifyContent: "center", alignItems: "center",
            shadowColor: theme.primary || "#22c55e",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
        },
        btnContent: { flexDirection: "row", alignItems: "center", gap: 12 },
        submitBtnText: { fontSize: 18, fontWeight: "800", color: "#fff" },

        /* Stepper */
        stepperContainer: {
            flexDirection: "row", alignItems: "center", justifyContent: "center",
            marginTop: 15, marginBottom: 10, alignSelf: "flex-end"
        },
        stepCircle: {
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: "#e2e8f0", justifyContent: "center", alignItems: "center",
        },
        activeStep: { backgroundColor: theme.primary || "#0ea5e9" },
        stepConnector: {
            width: 40, height: 2, backgroundColor: "#e2e8f0", marginHorizontal: 4
        },

        /* Payment Methods */
        paymentContainer: { marginTop: 10 },
        paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
        paymentItem: {
            width: "48%", padding: 16, borderRadius: 16,
            backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0",
            alignItems: "center", justifyContent: "center", gap: 10
        },
        selectedPaymentItem: { borderColor: theme.primary || "#0ea5e9", backgroundColor: (theme.primary || "#0ea5e9") + "08" },
        paymentItemText: { fontSize: 14, fontWeight: "700", color: theme.textMuted || "#64748b", textAlign: "center" },
        selectedPaymentItemText: { color: theme.primary || "#0ea5e9" },
        noMethodsText: { color: "#64748b", fontSize: 14, fontStyle: "italic" },

        /* Account Details */
        accountCard: {
            backgroundColor: "#fff", borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: theme.primary || "#0ea5e9", borderStyle: "dashed",
            marginBottom: 20
        },
        accountHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
        accountLabel: { fontSize: 13, fontWeight: "700", color: theme.textMuted || "#64748b" },
        accountNumber: { fontSize: 20, fontWeight: "800", color: theme.text || "#0f172a" },

        /* Receipt Upload */
        receiptSection: { marginBottom: 20 },
        receiptLabel: { fontSize: 15, fontWeight: "800", color: theme.text || "#334155", marginBottom: 10 },
        uploadBox: {
            height: 100, borderRadius: 16, backgroundColor: "#fff",
            borderWidth: 2, borderColor: "#cbd5e1", borderStyle: "dashed",
            justifyContent: "center", alignItems: "center", gap: 8
        },
        uploadText: { fontSize: 13, color: theme.textMuted || "#94a3b8", fontWeight: "600" },
        receiptPreview: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", paddingHorizontal: 20 },
        receiptName: { flex: 1, fontSize: 14, color: theme.text || "#334155", fontWeight: "600" },
        removeReceipt: { padding: 4 },

        /* Final Footer */
        finalFooter: { flexDirection: "row", alignItems: "center" },
        backBtn: {
            flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
            height: 60, borderRadius: 18, backgroundColor: "#f1f5f9"
        },
        backBtnText: { marginStart: 6, fontSize: 16, color: theme.footerText || "#64748b", fontWeight: "700" },
    });
};

export default getCheckoutStyles({});
