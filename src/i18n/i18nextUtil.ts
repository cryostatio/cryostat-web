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

import { useTranslation, UseTranslationResponse } from "react-i18next";

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

export const i18nLanguages = Object.keys(i18nResources);

export const i18nNamespaces = ['public', 'common'];

const I18N_NAMESPACES = process.env.I18N_NAMESPACE || i18nNamespaces;

export const localeReadable = (locale: string): string => {
  return new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard' }).of(locale) || locale;
};

/**
 * Hook for using the i18n translation with I18_NAMESPACE namespace
 */
export const useCryostatTranslation = (): UseTranslationResponse<string, undefined> => {
  return useTranslation(I18N_NAMESPACES);
};
