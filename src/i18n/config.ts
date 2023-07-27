/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import i18next from 'i18next';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en_common from '../../locales/en/common.json';
import en_public from '../../locales/en/public.json';
// import zh_common from '../../locales/zh/common.json';
// import zh_public from '../../locales/zh/public.json';

// TODO: .use(Backend) eventually store translations on backend?
// Openshift console does this already:
// https://github.com/openshift/console/blob/master/frontend/public/i18n.js
export const i18nResources = {
  en: {
    public: en_public,
    common: en_common,
  },
  // zh: {
  //   // TODO: add zh translation (and other languages)?
  //   // public: zh_public,
  //   // common: zh_common,
  // },
} as const;

export const i18nNamespaces = ['public', 'common'];

export const i18nLanguages = Object.keys(i18nResources);

// eslint-disable-next-line import/no-named-as-default-member
i18next
  .use(I18nextBrowserLanguageDetector)
  .use(initReactI18next)
  .init({
    resources: i18nResources,
    ns: i18nNamespaces,
    defaultNS: 'public',
    fallbackNS: ['common'],
    fallbackLng: ['en'],
    debug: process.env.NODE_ENV === 'development',
    returnNull: false,
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
    react: {
      useSuspense: true,
    },
  });

export default i18next;
