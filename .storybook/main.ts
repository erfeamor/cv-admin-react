import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
  },
  // Default react-docgen-typescript type-checks every component's full TS
  // program to build prop tables. It's a real but modest share of the
  // build's memory (~40 MB measured locally) — worth shedding since we don't
  // use PropTypes/JSDoc-style props anyway; see .drone.yml for the bulk fix.
  typescript: {
    reactDocgen: false,
  },
};

export default config;
