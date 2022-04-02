module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "tsconfig.json",
		sourceType: "module",
	},
	plugins: ["@typescript-eslint/eslint-plugin"],
	extends: ["plugin:@typescript-eslint/recommended"],
	root: true,
	env: {node: true},
	ignorePatterns: [".eslintrc.js"],
	rules: {
		"require-await": "off",
		"no-implied-eval": "off",

		"@typescript-eslint/await-thenable": "warn",
		"@typescript-eslint/no-floating-promises": "warn",
		"@typescript-eslint/no-for-in-array": "warn",
		"@typescript-eslint/no-implied-eval": "warn",
		"@typescript-eslint/no-misused-promises": "warn",
		"@typescript-eslint/no-unnecessary-type-assertion": "warn",
		"@typescript-eslint/no-unsafe-argument": "warn",
		"@typescript-eslint/no-unsafe-assignment": "warn",
		"@typescript-eslint/no-unsafe-call": "warn",
		"@typescript-eslint/no-unsafe-member-access": "warn",
		"@typescript-eslint/no-unsafe-return": "warn",
		"@typescript-eslint/require-await": "warn",
		"@typescript-eslint/restrict-plus-operands": "warn",
		"@typescript-eslint/restrict-template-expressions": "warn",
		"@typescript-eslint/unbound-method": "warn",

		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-explicit-any": "off",

		"@typescript-eslint/no-unused-vars": ["warn", {args: "none"}],
	},
};
