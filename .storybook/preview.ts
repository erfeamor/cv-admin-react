import type { Preview } from '@storybook/react-vite';
import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' shows violations in the UI; flip to 'error' to fail CI on them.
      test: 'todo',
    },
  },
  tags: ['autodocs'],
};

export default preview;
