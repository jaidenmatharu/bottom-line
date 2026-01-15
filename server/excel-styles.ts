export const EXCEL_STYLES = {
  colors: {
    navy: "1B2A4E",
    navyLight: "2C3E50",
    slate: "475569",
    slateLight: "64748B",
    white: "FFFFFF",
    offWhite: "FAFBFC",
    lightGray: "F1F5F9",
    mediumGray: "E2E8F0",
    borderGray: "CBD5E1",
    darkText: "0F172A",
    mutedText: "64748B",
    inputBlue: "1E40AF",
    accentBlue: "3B82F6",
    successGreen: "059669",
    successLight: "D1FAE5",
    warningAmber: "D97706",
    warningLight: "FEF3C7",
    dangerRed: "DC2626",
    dangerLight: "FEE2E2",
  },
  
  fonts: {
    primary: "Arial",
    mono: "Consolas",
  },
  
  sizes: {
    title: 16,
    subtitle: 12,
    header: 10,
    body: 10,
    small: 9,
  },
};

export const titleStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.title, 
    color: { rgb: EXCEL_STYLES.colors.navy }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left", vertical: "center" },
};

export const subtitleStyle = {
  font: { 
    italic: true, 
    sz: EXCEL_STYLES.sizes.subtitle, 
    color: { rgb: EXCEL_STYLES.colors.slateLight }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left", vertical: "center" },
};

export const brandStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.accentBlue }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left" },
};

export const sectionHeaderStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.header, 
    color: { rgb: EXCEL_STYLES.colors.white }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.navy } },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.navy } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.navy } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.navy } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.navy } },
  },
};

export const columnHeaderStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.header, 
    color: { rgb: EXCEL_STYLES.colors.white }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.navyLight } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.slate } },
    bottom: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.slate } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.slate } },
  },
};

export const columnHeaderLeftStyle = {
  ...columnHeaderStyle,
  alignment: { horizontal: "left", vertical: "center" },
};

export const subHeaderStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.navyLight }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.lightGray } },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.mediumGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.mediumGray } },
  },
};

export const rowLabelStyle = {
  font: { 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.darkText }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
  border: {
    bottom: { style: "hair", color: { rgb: EXCEL_STYLES.colors.mediumGray } },
  },
};

export const rowLabelBoldStyle = {
  font: { 
    bold: true,
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.darkText }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
};

export const dataStyle = {
  font: { 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.darkText }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
  border: {
    bottom: { style: "hair", color: { rgb: EXCEL_STYLES.colors.mediumGray } },
  },
};

export const dataStyleCurrency = {
  ...dataStyle,
  numFmt: '"$"#,##0',
};

export const dataStyleCurrencyDecimals = {
  ...dataStyle,
  numFmt: '"$"#,##0.00',
};

export const dataStylePercent = {
  ...dataStyle,
  numFmt: '0.0%',
};

export const dataStyleMultiple = {
  ...dataStyle,
  numFmt: '0.0"x"',
};

export const inputStyle = {
  font: { 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.inputBlue }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  fill: { fgColor: { rgb: "FFF8E1" } },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
  border: {
    top: { style: "thin", color: { rgb: "FFE082" } },
    bottom: { style: "thin", color: { rgb: "FFE082" } },
    left: { style: "thin", color: { rgb: "FFE082" } },
    right: { style: "thin", color: { rgb: "FFE082" } },
  },
};

export const inputStylePercent = {
  ...inputStyle,
  numFmt: '0.0%',
};

export const formulaStyle = {
  font: { 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.darkText }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
  border: {
    bottom: { style: "hair", color: { rgb: EXCEL_STYLES.colors.mediumGray } },
  },
};

export const formulaStylePercent = {
  ...formulaStyle,
  numFmt: '0.0%',
};

export const totalRowStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.darkText }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.lightGray } },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
  border: {
    top: { style: "medium", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "double", color: { rgb: EXCEL_STYLES.colors.navy } },
  },
};

export const totalRowLabelStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.darkText }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.lightGray } },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "double", color: { rgb: EXCEL_STYLES.colors.navy } },
  },
};

export const footerStyle = {
  font: { 
    italic: true, 
    sz: EXCEL_STYLES.sizes.small, 
    color: { rgb: EXCEL_STYLES.colors.slateLight }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left" },
};

export const highlightPositiveStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.successGreen }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
};

export const highlightNegativeStyle = {
  font: { 
    bold: true, 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.dangerRed }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: '#,##0',
};

export const irrStyleExcellent = {
  font: { bold: true, sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.white }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: "047857" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
};

export const irrStyleGood = {
  font: { sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.white }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: "10B981" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
};

export const irrStyleModerate = {
  font: { sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.darkText }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: "FCD34D" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
};

export const irrStylePoor = {
  font: { sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.white }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: "EF4444" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
};

export const getIrrStyle = (irr: number) => {
  if (irr >= 25) return irrStyleExcellent;
  if (irr >= 20) return irrStyleGood;
  if (irr >= 15) return irrStyleModerate;
  return irrStylePoor;
};

export const sensitivityCornerStyle = {
  font: { bold: true, sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.navyLight }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.mediumGray } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    bottom: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    left: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    right: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
  },
};

export const sensitivityHeaderStyle = {
  font: { bold: true, sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.white }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.slate } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    bottom: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
};

export const sensitivityRowLabelStyle = {
  font: { bold: true, sz: EXCEL_STYLES.sizes.body, color: { rgb: EXCEL_STYLES.colors.white }, name: EXCEL_STYLES.fonts.primary },
  fill: { fgColor: { rgb: EXCEL_STYLES.colors.slate } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    left: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
    right: { style: "medium", color: { rgb: EXCEL_STYLES.colors.navy } },
  },
};

export const coverTitleStyle = {
  font: { 
    bold: true, 
    sz: 28, 
    color: { rgb: EXCEL_STYLES.colors.navy }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "center", vertical: "center" },
};

export const coverSubtitleStyle = {
  font: { 
    sz: 14, 
    color: { rgb: EXCEL_STYLES.colors.slate }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "center", vertical: "center" },
};

export const coverDateStyle = {
  font: { 
    italic: true,
    sz: 11, 
    color: { rgb: EXCEL_STYLES.colors.slateLight }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "center", vertical: "center" },
};

export const coverConfidentialStyle = {
  font: { 
    bold: true,
    sz: 10, 
    color: { rgb: EXCEL_STYLES.colors.dangerRed }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "center", vertical: "center" },
};

export const tocLinkStyle = {
  font: { 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.accentBlue }, 
    name: EXCEL_STYLES.fonts.primary,
    underline: true,
  },
  alignment: { horizontal: "left", vertical: "center" },
};

export const tocDescStyle = {
  font: { 
    sz: EXCEL_STYLES.sizes.body, 
    color: { rgb: EXCEL_STYLES.colors.slateLight }, 
    name: EXCEL_STYLES.fonts.primary 
  },
  alignment: { horizontal: "left", vertical: "center" },
};

export const standardColWidths = {
  label: 32,
  data: 14,
  narrow: 10,
  wide: 20,
  currency: 16,
};

export const standardRowHeight = 18;
export const headerRowHeight = 22;
export const titleRowHeight = 28;

export const applyAllBorders = (style: any) => ({
  ...style,
  border: {
    top: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    bottom: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    left: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
    right: { style: "thin", color: { rgb: EXCEL_STYLES.colors.borderGray } },
  },
});
