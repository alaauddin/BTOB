import { StyleSheet, Dimensions, Platform } from 'react-native';
import { THEME } from './profileTheme';

const { width } = Dimensions.get('window');

/**
 * profileStyles.js
 * 
 * Shared premium styles for the Merchant Profile components.
 */

export const styles = StyleSheet.create({
  // Root and Base
  root: { flex: 1, backgroundColor: THEME.colors.slate[50] },
  scroll: { paddingBottom: 100 },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, zIndex: 100, borderBottomWidth: 1, borderBottomColor: THEME.colors.slate[100] },
  headerContent: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: THEME.colors.slate[800] },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: THEME.colors.slate[400], fontWeight: '700' },

  // Hero Section
  heroSection: { marginBottom: 20 },
  coverWrapper: { height: 220, overflow: 'hidden' },
  heroCover: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
  meshBlob: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
  coverPlaceholder: { alignItems: 'center' },
  heroMain: { paddingHorizontal: 20, marginTop: -40 },
  identityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16 },
  logoAnchor: { position: 'relative' },
  logoOutline: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFF', borderWidth: 4, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  heroLogoImg: { width: '100%', height: '100%' },
  logoInitialWrap: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  heroLogoText: { fontSize: 36, fontWeight: '900' },
  logoEditBadge: { position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  titleStack: { flex: 1, paddingTop: 30 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: THEME.colors.slate[900], textAlign: 'right' },
  heroSub: { fontSize: 12, color: THEME.colors.primary, fontWeight: '700', marginTop: 2, textAlign: 'right' },
  statsStrip: { flexDirection: 'row-reverse', backgroundColor: '#FFF', borderRadius: 20, marginTop: 20, padding: 16, elevation: 2, shadowOpacity: 0.05, shadowRadius: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '900', color: THEME.colors.slate[800] },
  statLab: { fontSize: 10, color: THEME.colors.slate[400], marginTop: 2, fontWeight: '700' },
  divider: { width: 1, height: '80%', backgroundColor: THEME.colors.slate[100], alignSelf: 'center' },

  // Content Cards
  contentBody: { paddingHorizontal: 16, marginTop: 10 },
  groupCard: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: THEME.colors.slate[100] },
  groupHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  groupHeaderTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  groupIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupHeaderText: { fontSize: 16, fontWeight: '800', color: THEME.colors.slate[800] },
  groupBody: { gap: 16 },

  // Premium Inputs
  premInputWrap: { marginBottom: 4 },
  premInputLabel: { fontSize: 12, fontWeight: '700', color: THEME.colors.slate[400], marginBottom: 8, marginRight: 4, textAlign: 'right' },
  premInputInner: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: THEME.colors.slate[50], borderRadius: 16, borderWidth: 1, borderColor: THEME.colors.slate[100], height: 56, paddingHorizontal: 16 },
  premInputDisabled: { backgroundColor: THEME.colors.slate[100] },
  premInputIcon: { marginLeft: 12 },
  premInputField: { flex: 1, fontSize: 15, fontWeight: '600', color: THEME.colors.slate[800], height: '100%' },
  premInputMulti: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  colorPreview: { width: 22, height: 22, borderRadius: 8, borderWidth: 1.5, borderColor: '#FFF', marginLeft: 10 },
  
  // Toggles
  premToggleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  premToggleLabelSide: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  tinyIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME.colors.slate[50], justifyContent: 'center', alignItems: 'center' },
  premToggleLabel: { fontSize: 14, fontWeight: '700', color: THEME.colors.slate[700] },

  // Mockup Preview
  mockupFrame: { backgroundColor: THEME.colors.slate[900], borderRadius: 36, padding: 8, marginVertical: 20, alignSelf: 'center', width: 220, elevation: 20 },
  mockupBezel: { backgroundColor: '#FFF', borderRadius: 28, overflow: 'hidden' },
  mockupStatusBar: { height: 24, justifyContent: 'center', alignItems: 'center' },
  mockupIsland: { width: 60, height: 12, backgroundColor: THEME.colors.slate[900], borderRadius: 6 },
  mockupNav: { height: 40, paddingHorizontal: 12, justifyContent: 'center' },
  mockupNavItems: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  mockupBrandName: { fontSize: 10, fontWeight: '900' },
  mockupContent: { height: 140, padding: 12, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mockupHeroMock: { width: '100%', flex: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mockupBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  mockupBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  mockupFooter: { height: 30 },

  // Map Component
  mapContainer: { height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 16 },
  profileMap: { flex: 1 },
  mapHintBadge: { position: 'absolute', bottom: 12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  mapHintText: { fontSize: 11, fontWeight: '800' },

  // Presets List
  presetList: { marginBottom: 16 },
  presetItem: { width: 90, height: 90, borderRadius: 20, backgroundColor: '#FFF', marginRight: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, gap: 8 },
  presetIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  presetItemName: { fontSize: 11, fontWeight: '800', color: THEME.colors.slate[600] },

  // Footer & Save Actions
  footerActions: { marginTop: 20, gap: 16 },
  simpleAction: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 8 },
  simpleActionText: { fontSize: 13, fontWeight: '700', color: THEME.colors.slate[500], marginRight: 8 },

  // Payment Link in Profile
  paymentLinkCard: { 
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: THEME.colors.slate[50], padding: 16, borderRadius: 20, marginTop: 4,
    borderWidth: 1, borderColor: THEME.colors.slate[100]
  },
  paymentLinkContent: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  paymentActiveList: { flexDirection: 'row-reverse', marginLeft: 16, alignItems: 'center', width: 60 },
  tinyMethodCircle: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: '#FFF', elevation: 2, shadowOpacity: 0.1, shadowRadius: 2 },
  paymentTitle: { fontSize: 15, fontWeight: '800', color: THEME.colors.slate[800] },
  paymentSub: { fontSize: 11, color: THEME.colors.slate[400], marginTop: 2 },
  noPaymentsText: { fontSize: 10, color: THEME.colors.slate[400], fontWeight: '700' },
  logoutAction: { opacity: 0.8 },
  floatingAction: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  mainSaveBtn: { height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: THEME.colors.primary, shadowOpacity: 0.3, shadowRadius: 15 },
  btnInner: { flexDirection: 'row-reverse', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },

  // Misc
  merchantItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: THEME.colors.slate[50] },
  merchantMain: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  merchantLogo: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  merchantInitial: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  merchantName: { fontSize: 15, fontWeight: '700', color: THEME.colors.slate[700] },
  activePill: { backgroundColor: THEME.colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activePillText: { fontSize: 10, fontWeight: '900', color: THEME.colors.primary },
  aiTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  aiTagText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  gridRow: { flexDirection: 'row', gap: 16 },
  groupSubTitle: { fontSize: 13, fontWeight: '900', color: THEME.colors.slate[400], marginBottom: 12, marginTop: 10, textAlign: 'right' },
});
