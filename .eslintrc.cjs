module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    browser: true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off'
  },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      },
      typescript: {
        project: ['apps/api/tsconfig.json', 'apps/web/tsconfig.json', 'packages/contracts/tsconfig.json']
      }
    }
  },
  overrides: [
    {
      files: ['apps/api/**/*.{ts,tsx}'],
      env: { node: true, browser: false }
    }
  ]
};
