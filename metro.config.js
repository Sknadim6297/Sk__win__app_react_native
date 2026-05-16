const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

// Prefer compiled `main` over `react-native` (src/) for packages like Reanimated
// whose TypeScript sources are not always resolved by Metro on Windows.
config.resolver.resolverMainFields = ['main', 'module', 'react-native'];

const defaultResolveRequest = config.resolver.resolveRequest;

// Redirect every `import ... from 'react-native'` that originates from project
// source files to our themed wrapper, which injects the Orbitron font into all
// Text and TextInput components without touching individual screen files (Poppins).
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
