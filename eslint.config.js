const eslintTypeScriptParser = require("@typescript-eslint/parser");
const eslintTypeScriptPlugin = require("@typescript-eslint/eslint-plugin");
const eslintPluginReactHooks = require("eslint-plugin-react-hooks");
const eslintPluginReact = require("eslint-plugin-react");
const eslintPluginImport = require("eslint-plugin-import");
const eslintPluginUnusedImports = require("eslint-plugin-unused-imports");
const prettier = require("prettier");

module.exports = [{
    ignores: ['src/mirage/', '**/node_modules/'],
  },
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      // tells eslint to use the TypeScript parser
      parser: eslintTypeScriptParser,
      // tell the TypeScript parser that we want to use JSX syntax
      parserOptions: {
        "tsx": true,
        "jsx": true,
        "js": true,
        "useJSXTextNode": true,
        "project": "./tsconfig.json",
        "tsconfigRootDir": "."
      },
      globals: {
        "window": "readonly",
        "describe": "readonly",
        "test": "readonly",
        "expect": "readonly",
        "it": "readonly",
        "process": "readonly",
        "document": "readonly"
      },
    },
    settings: {
      "react": {
        "version": "detect"
      }
    },
    // includes the typescript specific rules found here: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#supported-rules
    plugins: {
      "@typescript-eslint": eslintTypeScriptPlugin,
      "react-hooks": eslintPluginReactHooks,
      "react": eslintPluginReact,
      "eslint-plugin-react-hooks": eslintPluginReactHooks,
      "unused-imports": eslintPluginUnusedImports,
      "import": eslintPluginImport,
      "prettier": prettier
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/triple-slash-reference": ["error", { "lib": "always", "path": "always", "types": "prefer-import" }],
      "import/extensions": "off",
      "import/no-cycle": "warn",
      "import/no-named-as-default": "off",
      "import/no-unresolved": "off",
      "import/order": ["warn", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }],
      "no-console": ["error", {
        "allow": ["warn", "error"]
      }],
      "prettier/prettier": "off",
      "react/prop-types": "off",
      "react/jsx-uses-react": "warn",
      "react/jsx-uses-vars": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
      ]
   }
  }];
