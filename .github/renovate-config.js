module.exports = {
  username: 'phyzical',
  gitAuthor: 'phyzical <5182053+phyzical@users.noreply.github.com>',
  onboarding: false,
  requireConfig: 'optional',
  // the housekeeping workflow handles this
  automerge: false,
  ignoreTests: false,
  platform: 'github',
  forkProcessing: 'enabled',
  labels: ['dependencies'],
  ignorePaths: [
    '**/node_modules/**',
    '**/bower_components/**',
    '**/vendor/**',
    '**/examples/**',
    '**/__tests__/**',
    '**/tests/**',
    '**/__fixtures__/**',
    '**/.terraform/**',
  ],
  extends: [
    ':dependencyDashboard',
    ':semanticPrefixFixDepsChoreOthers',
    'group:monorepos',
    'group:recommended',
    'replacements:all',
    'workarounds:all',
  ],
  ignorePresets: [':prHourlyLimit2'],
  prHourlyLimit: 0,
  prConcurrentLimit: 0,
  commitMessageAction: 'Upgrade',
  commitMessageTopic: '{{packageName}}/{{depName}}',
  commitMessageExtra: '{{currentVersion}} -> {{newVersion}}',
  customManagers: [
    {
      customType: 'regex',
      description: 'Update dockerfile github releases',
      fileMatch: ['Dockerfile'],
      datasourceTemplate: 'github-releases',
      matchStrings: [
        '\\s*#\\s*renovate:\\s*datasource=(?<datasource>[^\\s]+)' +
        '\\s*depName=(?<depName>.*?)\\s*ARG\\s.*?_VERSION\\s*=\\s*"*(?<currentValue>.*)"*',
      ],
    },
    {
      customType: 'regex',
      fileMatch: ['Dockerfile'],
      matchStrings: [
        '\\s*#\\s*renovate:\\s*datasource=(?<datasource>[^\\s]+)' +
        '\\s*repo=(?<registryUrl>[^\\s]+)\\s+(?<depName>[^\\s]+)-(?<currentValue>[^\\s-]+-[^\\s-]+)',
      ],
      datasourceTemplate: 'npm',
      depTypeTemplate: 'yum',
      versioningTemplate: 'loose',
      registryUrlTemplate: 'https://yum2npm.io/repos/{{replace \'/\' \'/modules/\' registryUrl}}/packages',
    },
  ],
  packageRules: [
    {
      matchDatasources: ['docker'],
      matchPackageNames: ['rockylinux'],
      versioning: 'semver'
    },
    {
      matchDatasources: ['github-releases'],
      extractVersion: '^v(?<version>.*)$',
    },
    {
      matchFileNames: ['Dockerfile'],
      matchDepTypes: ['yum'],
      groupName: 'yum',
      addLabels: ['dockerDependencies'],
    },
    {
      matchPackagePatterns: ['eslint', 'prettier'],
      groupName: 'lint',
      addLabels: ['devDependencies'],
    },
    {
      matchPackagePatterns: ['@types'],
      groupName: 'types',
      addLabels: ['devDependencies'],
    },
    {
      matchPackagePatterns: ['jest'],
      groupName: 'jest',
      addLabels: ['devDependencies'],
    },
    { matchFileNames: ['Dockerfile'], addLabels: ['dockerDependencies'] },
    { matchDepTypes: ['development'], addLabels: ['devDependencies'] },
    { matchDepTypes: ['test'], addLabels: ['testDependencies'] },
  ],
};
