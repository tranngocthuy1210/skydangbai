import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  // Bảng màu trạng thái là hằng số trong components/StatusBadge.tsx — một
  // nguồn sự thật duy nhất, thay vì rải giữa config và component.
  theme: { extend: {} },
  plugins: [],
};

export default config;
