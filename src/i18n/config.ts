/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
