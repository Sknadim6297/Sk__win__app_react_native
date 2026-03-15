import { Text, TextInput } from 'react-native';

let typographyInitialized = false;

// Font injection is handled globally via Metro (utils/themed-react-native.js).
// This function only disables system font scaling so sizes stay consistent.
export const applyGlobalTypography = () => {
  if (typographyInitialized) return;
  typographyInitialized = true;

  Text.defaultProps = Text.defaultProps || {};
  TextInput.defaultProps = TextInput.defaultProps || {};
  Text.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.allowFontScaling = false;
};
