import { StyleSheet, Dimensions } from 'react-native';
import { BRAND } from '../../theme/brand';
import Text from '../AppText';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  modalSheet: { 
    backgroundColor: BRAND.colors.white, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    paddingHorizontal: 24, 
    paddingTop: 12, 
    paddingBottom: 40, 
    maxHeight: height * 0.8
  },
  handle: { 
    width: 40, 
    height: 4, 
    backgroundColor: BRAND.colors.slate[200], 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 24 
  },
  header: { 
    marginBottom: 20, 
    width: '100%',
    alignItems: 'flex-start'
  },
  title: { 
    fontSize: 22, 
    fontFamily: BRAND.typography.bold, 
    color: BRAND.colors.slate[800], 
    marginBottom: 8,
    alignSelf: 'stretch'
  },
  subtitle: { 
    fontSize: 14, 
    color: BRAND.colors.slate[500], 
    lineHeight: 22,
    alignSelf: 'stretch'
  },
  contactBox: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    backgroundColor: BRAND.colors.slate[100], 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 12, 
    gap: 10,
    alignSelf: 'flex-start'
  },
  contactText: { 
    fontSize: 13, 
    fontFamily: BRAND.typography.semiBold, 
    color: BRAND.colors.slate[600], 
    textAlign: 'left'
  },
  
  loaderWrap: { 
    padding: 40, 
    alignItems: 'center' 
  },
  plansScroll: { 
    marginBottom: 20 
  },
  planCard: { 
    backgroundColor: BRAND.colors.white, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: BRAND.colors.slate[100], 
    marginBottom: 12 
  },
  planHeader: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  planIconWrap: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  planTitleWrap: { 
    flex: 1, 
    marginLeft: 12,
    alignItems: 'flex-start'
  },
  planName: { 
    fontSize: 16, 
    fontFamily: BRAND.typography.bold, 
    color: BRAND.colors.slate[800], 
    textAlign: 'left',
    alignSelf: 'stretch'
  },
  planPrice: { 
    fontSize: 13, 
    color: BRAND.colors.slate[500], 
    textAlign: 'left',
    alignSelf: 'stretch'
  },
  checkCircle: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  benefitsBox: { 
    backgroundColor: BRAND.colors.slate[50], 
    borderRadius: 16, 
    padding: 16, 
    marginTop: 10 
  },
  benefitsTitle: { 
    fontSize: 14, 
    fontFamily: BRAND.typography.bold, 
    color: BRAND.colors.slate[600], 
    marginBottom: 12, 
    alignSelf: 'stretch'
  },
  benefitRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8, 
    gap: 8,
    justifyContent: 'flex-start'
  },
  benefitText: { 
    fontSize: 13, 
    color: BRAND.colors.slate[500], 
    flex: 1
  },
  
  footer: { 
    gap: 12 
  },
  subscribeBtn: { 
    height: 56, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  subscribeBtnText: { 
    color: BRAND.colors.white, 
    fontSize: 18, 
    fontFamily: BRAND.typography.bold 
  },
  cancelBtn: { 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cancelBtnText: { 
    color: BRAND.colors.slate[400], 
    fontSize: 16 
  }
});
