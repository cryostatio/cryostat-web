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

/**
 * i18n configurations for testing that set default language to en
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en_common from '../../locales/en/common.json';
import en_public from '../../locales/en/public.json';

export const i18nResources = {
  en: {
    public: en_public,
    common: en_common,
  },
} as const;

export const i18nNamespaces = ['public', 'common'];

export const i18nLanguages = Object.keys(i18nResources);

// eslint-disable-next-line import/no-named-as-default-member
i18next.use(initReactI18next).init({
  resources: i18nResources,
  lng: 'en',
  ns: i18nNamespaces,
  defaultNS: 'public',
  fallbackNS: ['common'],
  fallbackLng: ['en'],
  debug: false,
  returnNull: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: true,
  },
});

export default i18next;
