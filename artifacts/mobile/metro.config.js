const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// pnpm workspace monorepo: the app lives in artifacts/mobile but dependencies
// are hoisted to the repo root. Point Metro at both so it can resolve packages
// (e.g. expo-router/entry) and watch the workspace store. Without this, an
// embedded release bundle fails with "Unable to resolve module".
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
