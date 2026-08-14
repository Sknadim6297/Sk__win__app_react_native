const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

// Prefer compiled `main` over `react-native` (src/) for packages like Reanimated
// whose TypeScript sources are not always resolved by Metro on Windows.
config.resolver.resolverMainFields = ['main', 'module', 'react-native'];

// Block unused @expo/vector-icons font files from the asset graph / APK.
// App only uses Ionicons + MaterialCommunityIcons (~1.7MB); other families ~2.2MB+.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  /node_modules[\\/]@expo[\\/]vector-icons[\\/].*[\\/]Fonts[\\/](?!Ionicons\.ttf$|MaterialCommunityIcons\.ttf$).*/,
  /node_modules[\\/]react-native-vector-icons[\\/]Fonts[\\/](?!Ionicons\.ttf$|MaterialCommunityIcons\.ttf$).*/,
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath || '';

  // qrcode's package "main" points at Node server (fs/png). RN/Expo needs the
  // pure core used by react-native-qrcode-svg's genMatrix (QRCode.create only).
  if (moduleName === 'qrcode') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/qrcode/lib/core/qrcode.js'),
      type: 'sourceFile',
    };
  }

  // expo-web-browser: Metro on Windows can fail to resolve ./WebBrowser.types → WebBrowser.types.js
  if (
    typeof moduleName === 'string' &&
    (moduleName === './WebBrowser.types' || moduleName.endsWith('/WebBrowser.types')) &&
    origin.replace(/\\/g, '/').includes('node_modules/expo-web-browser/')
  ) {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/expo-web-browser/build/WebBrowser.types.js'),
      type: 'sourceFile',
    };
  }

  // Only ship Ionicons + MaterialCommunityIcons fonts (saves ~3MB+ of unused .ttf).
  // Deep paths like `@expo/vector-icons/Ionicons` still resolve normally.
  if (moduleName === '@expo/vector-icons') {
    return {
      filePath: path.resolve(projectRoot, 'utils/expoVectorIcons.js'),
      type: 'sourceFile',
    };
  }

  // Prevent accidental deep imports of unused icon families.
  if (
    typeof moduleName === 'string' &&
    moduleName.startsWith('@expo/vector-icons/') &&
    !['@expo/vector-icons/Ionicons', '@expo/vector-icons/MaterialCommunityIcons'].includes(
      moduleName
    )
  ) {
    return {
      type: 'empty',
    };
  }

  const isProjectFile =
    origin.startsWith(projectRoot) &&
    !origin.includes('node_modules') &&
    !origin.includes('themed-react-native');

  if (isProjectFile && moduleName === 'react-native') {
    return {
      filePath: path.resolve(projectRoot, 'utils/themed-react-native.js'),
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
