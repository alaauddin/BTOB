import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { THEME } from './profileTheme';

const { width } = Dimensions.get('window');

/**
 * profileStyles.js
 * 
 * Shared premium styles for the Merchant Profile components.
 * Optimized for 'Steel & Fire' identity and RTL compatibility.
 */

export const styles = StyleSheet.create({
  // Root and Base
  root: { flex: 1, backgroundColor: THEME.colors.slate[50] },
  scroll: { paddingBottom: 120 },
  
  stickyHeader: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 100, 
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerSafe: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    height: 75 
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  floatingBackBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 15, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 16, color: THEME.colors.slate[400], fontWeight: '800', fontSize: 13 },

  // Hero Section
  heroSection: { marginBottom: 25 },
  coverWrapper: { height: 240, overflow: 'hidden' },
  heroCover: { width: '100%', height: 240, justifyContent: 'center', alignItems: 'center' },
  coverPlaceholder: { alignItems: 'center' },
  
  heroMain: { paddingHorizontal: 20, marginTop: -60 },
  identityRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
  logoAnchor: { position: 'relative' },
  logoOutline: { 
    width: 110, 
    height: 110, 
    borderRadius: 30, 
    backgroundColor: '#FFF', 
    padding: 4,
    elevation: 12, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  heroLogoImg: { width: '100%', height: '100%', borderRadius: 26 },
  logoInitialWrap: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 26 },
  heroLogoText: { fontSize: 42, fontWeight: '900' },
  logoEditBadge: { 
    position: 'absolute', 
    bottom: -6, 
    left: -6, 
    width: 34, 
    height: 34, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3, 
    borderColor: '#FFF',
    elevation: 5
  },
  
  titleStack: { flex: 1, paddingBottom: 10 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: THEME.colors.slate[900] },
  heroSub: { fontSize: 13, color: THEME.colors.primary, fontWeight: '800', marginTop: 4 },

  statsStrip: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    marginTop: 25, 
    padding: 20, 
    elevation: 5, 
    shadowColor: '#000',
    shadowOpacity: 0.05, 
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '900', color: THEME.colors.slate[800] },
  statLab: { fontSize: 11, color: THEME.colors.slate[400], marginTop: 4, fontWeight: '800' },
  divider: { width: 1, height: '70%', backgroundColor: '#F1F5F9', alignSelf: 'center' },

  // Content Cards
  contentBody: { paddingHorizontal: 20 },
  groupCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 30, 
    padding: 24, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  groupHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupIconWrap: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  groupHeaderText: { fontSize: 18, fontWeight: '900', color: THEME.colors.slate[800] },
  groupBody: { gap: 20 },

  // Premium Inputs
  premInputWrap: { marginBottom: 6 },
  premInputLabel: { fontSize: 13, fontWeight: '800', color: THEME.colors.slate[500], marginBottom: 10, marginLeft: 4 },
  premInputInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    minHeight: 60, 
    paddingHorizontal: 18 
  },
  premInputDisabled: { backgroundColor: '#F1F5F9', opacity: 0.7 },
  premInputIcon: { marginRight: 14 },
  premInputField: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '700', 
    color: THEME.colors.slate[800], 
    height: '100%',
    paddingVertical: 12
  },
  premInputMulti: { minHeight: 120, textAlignVertical: 'top' },
  colorPreview: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#FFF', marginLeft: 12, elevation: 2 },
  
  // Toggles
  premToggleRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  premToggleLabelSide: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tinyIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  premToggleLabel: { fontSize: 15, fontWeight: '800', color: THEME.colors.slate[700] },

  // Mockup Preview
  mockupFrame: { backgroundColor: THEME.colors.slate[900], borderRadius: 45, padding: 10, marginVertical: 25, alignSelf: 'center', width: 240, elevation: 25 },
  mockupBezel: { backgroundColor: '#FFF', borderRadius: 36, overflow: 'hidden' },
  mockupStatusBar: { height: 26, justifyContent: 'center', alignItems: 'center' },
  mockupIsland: { width: 65, height: 14, backgroundColor: THEME.colors.slate[900], borderRadius: 7 },
  mockupNav: { height: 45, paddingHorizontal: 15, justifyContent: 'center' },
  mockupNavItems: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mockupBrandName: { fontSize: 11, fontWeight: '900' },
  mockupContent: { height: 160, padding: 15, justifyContent: 'center', alignItems: 'center', gap: 15 },
  mockupHeroMock: { width: '100%', flex: 1, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  mockupBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  mockupBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  mockupFooter: { height: 35 },

  // Map Component
  mapContainer: { height: 220, borderRadius: 28, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  profileMap: { flex: 1 },
  mapHintBadge: { position: 'absolute', bottom: 15, alignSelf: 'center', borderRadius: 14, overflow: 'hidden' },
  mapHintText: { fontSize: 12, fontWeight: '900', paddingHorizontal: 16, paddingVertical: 8 },

  // Presets List
  presetList: { marginBottom: 20 },
  presetItem: { 
    width: 100, 
    height: 100, 
    borderRadius: 24, 
    backgroundColor: '#FFF', 
    marginRight: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  presetIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  presetItemName: { fontSize: 12, fontWeight: '900', color: THEME.colors.slate[600] },

  // Footer & Save Actions
  footerActions: { marginTop: 30, gap: 10, paddingBottom: 20 },
  simpleAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    padding: 16, 
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  simpleActionText: { fontSize: 14, fontWeight: '800', color: THEME.colors.slate[500] },
  logoutAction: { borderColor: THEME.colors.rose + '20' },

  // Floating Save Button
  floatingAction: { position: 'absolute', bottom: 25, left: 20, right: 20 },
  mainSaveBtn: { 
    height: 70, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 10, 
    shadowColor: THEME.colors.primary, 
    shadowOpacity: 0.3, 
    shadowRadius: 20 
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },

  // Misc
  merchantItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  merchantMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  merchantLogo: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  merchantInitial: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  merchantName: { fontSize: 16, fontWeight: '800', color: THEME.colors.slate[700] },
  activePill: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.emerald + '30' },
  activePillText: { fontSize: 11, fontWeight: '900', color: THEME.colors.emerald },
  
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 14 },
  aiTagText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  gridRow: { flexDirection: 'row', gap: 16 },
  groupSubTitle: { fontSize: 14, fontWeight: '900', color: THEME.colors.slate[400], marginBottom: 15, marginTop: 15 },

  // Payment Link Card
  paymentLinkCard: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, marginTop: 10,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  paymentLinkContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 },
  paymentActiveList: { flexDirection: 'row', alignItems: 'center' },
  tinyMethodCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#FFF', 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 5,
    backgroundColor: '#FFF'
  },
  paymentTitle: { fontSize: 16, fontWeight: '900', color: THEME.colors.slate[800] },
  paymentSub: { fontSize: 12, color: THEME.colors.slate[400], marginTop: 4, fontWeight: '800' },
  noPaymentsText: { fontSize: 11, color: THEME.colors.slate[400], fontWeight: '800' },
});

