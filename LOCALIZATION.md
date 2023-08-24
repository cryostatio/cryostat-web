## Localization with react-i18next

Cryostat-web uses [i18next](https://www.i18next.com/) as an internationalization-framework. The react-i18next package is used to integrate i18next with React. To add new user strings to the project, they must be handled in the manner below.

### Adding a new translation

The current list of language locales supported in Cryostat can be found in `src/i18n/config.ts`. The translations themselves can be found in `locales/{LOCALE_CODE}` 

To add a new language, add a new entry to the `i18nResources` object in `src/i18n.ts`. The key should be the language locale, and the value should be the translation object containing the corresponding namespace json files in `locales`.

To add a new localization key for a user-facing string in `cryostat-web`, use the `t` function from `react-i18next`:

```tsx
import { useTranslation } from 'react-i18next';
...
export const SomeFC = (props) => {
    const { t } = useTranslation();

    return (
        <div>
            {t('somekey')}
        </div>
    );
}
```
After saving the file, and running `yarn localize`, this will generate a new key in the `en` locale namespace json file in `/locales/en/common.json` *(having multiple locales will add a key to each locale json file!)*:
```bash
$ yarn localize # uses i18next-parser to generate based on files in src/
```
`locales/en/common.json`
```json
{   
    ...
    "somekey": "cryostat_tmp",
    ...
}
```

The value of the key will be the string `cryostat_tmp` by default (we set this in `i18next-parser.config.js`). This is a placeholder value that should be replaced with the actual translation by going to the corresponding locale json file and manually replacing the value with the translation.

`locales/en/common.json`
```json
{   
    ...
    "somekey": "This is a translation",
    ...
}
```



The React i18next API docs can be found [here](https://react.i18next.com/latest/using-with-hooks).

### Cryostat locale namespaces

Currently the two namespaces are `common` and `public`.

If you want to add a new key to a specific namespace, you can specify the namespace as the first argument to the `t` function:

```tsx
<div>
  {t('SOME_COMMON_KEY', { ns: 'common' })}
</div>
```

In `cryostat-web`, we use `common` for common user-facing strings that you may see all the time: e.g. `Home`, `Help`, `Cancel`, etc.


```tsx
<div>
  {t('Cancel')}
</div>
```

`locales/en/common.json`
```json
{
    "CANCEL": "Cancel",
}
```
These keys should be capitalized, and should be unique within the namespace.

If we want to localize specific user-facing strings that are only used in a specific component, we can use the `public` namespace. We don't actually need to specify the namespace in this case for the `t` function, since we set this as the default namespace in `src/i18n/config.ts`:

```tsx
<div>
  {t(`AboutDescription.VERSION`)}
</div>
```
`locales/en/public.json`
```json
  ...
  "AboutDescription": {
    "BUGS": "Bugs",
    "FILE_A_REPORT": "File a Report",
    "VERSION": "some version!"
  },
  ...
```

To run unit tests using Jest that use a translation, but we want to test the value, use the `testT` function from `src/test/Common.tsx`:

e.g.
```tsx
expect(screen.getByText(testT('CRYOSTAT_TRADEMARK', { ns: 'common' }))).toBeInTheDocument();
```
