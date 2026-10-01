module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',
	],
	// Disconnected pre-Zustand implementations are retained as historical fixtures.
	ignorePatterns: ['dist', 'release', 'tmp', 'node_modules', 'src/helpers/**', 'src/indexedDB.js', 'src/hooks/useAutoSave.js', 'src/hooks/useAutoSaveNodesAndEdges.js'],
	parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	settings: { react: { version: '18.3' } },
	plugins: ['react-refresh'],
	overrides: [
		{
			files: ['electron/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,cjs,mjs}', 'tests/**/*.{js,cjs,mjs}', '*.config.{js,cjs,mjs}', '.eslintrc.cjs'],
			env: { node: true },
		},
	],
	rules: {
		'react/prop-types': 'off',
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true },
		],
	},
};
