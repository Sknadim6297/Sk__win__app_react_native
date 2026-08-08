const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

// Prefer compiled `main` over `react-native` (src/) for packages like Reanimated
// whose TypeScript sources are not always resolved by Metro on Windows.
config.resolver.resolverMainFields = ['main', 'module', 'react-native'];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // qrcode's package "main" points at Node server (fs/png). RN/Expo needs the
  // pure core used by react-native-qrcode-svg's genMatrix (QRCode.create only).
  if (moduleName === 'qrcode') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/qrcode/lib/core/qrcode.js'),
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

  const origin = context.originModulePath;
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
