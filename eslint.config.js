const js = require("@eslint/js");

const EslintTypeScriptParser = require("@typescript-eslint/parser");
const EslintPluginReactHooks = require("eslint-plugin-react-hooks");
const EslintPluginReact = require("eslint-plugin-react");
const EslintPluginImport = require("eslint-plugin-import");
const EslintPluginUnusedImports = require("eslint-plugin-unused-imports");
const EslintTypeScriptPlugin = require("@typescript-eslint/eslint-plugin");

module.exports [
  js.configs.recommended,
  EslintPluginReact.configs["jsx-runtime", "recommended"],
  EslintPluginImport.configs.recommended,
  EslintPluginImport.configs.typescript,
  EslintTypeScriptPlugin.configs.recommended,

  {
    languageOptions: {
      // tells eslint to use the TypeScript parser
      parser: EslintTypeScriptParser,
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
      "@typescript-eslint": EslintTypeScriptPlugin,
      "react-hooks": EslintPluginReactHooks,
      "react": EslintPluginReact,
      "eslint-plugin-react-hooks": EslintPluginReactHooks,
      "unused-imports": EslintPluginUnusedImports,
      "import": EslintPluginImport,
    },
    ignores: [
      "src/mirage/**"
    ],
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
  }  
]
