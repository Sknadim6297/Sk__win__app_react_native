const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

// Redirect every `import ... from 'react-native'` that originates from project
// source files to our themed wrapper, which injects the Orbitron font into all
// Text and TextInput components without touching individual screen files.
// The wrapper itself is excluded so it can safely require the real react-native.
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

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
