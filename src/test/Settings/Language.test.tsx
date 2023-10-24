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

import { Language } from '@app/Settings/Config/Language';
import i18next, { i18nLanguages } from '@i18n/config';
import { localeReadable } from '@i18n/i18nextUtil';
import { act, cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { render, testT } from '../utils';

describe('<Language/>', () => {
  let detectedLanguage: string;
  beforeAll(() => {
    detectedLanguage = i18next.language;
  });

  beforeEach(() => {
    // Shared instance of i18next
    i18next.changeLanguage(detectedLanguage);
  });

  afterEach(cleanup);

  it('should default to detected language if supported', async () => {
    i18next.changeLanguage('en');

    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(Language.content, null),
          },
        ],
      },
    });

    const defaultLocale = screen.getByText(localeReadable('en'));
    expect(defaultLocale).toBeInTheDocument();
    expect(defaultLocale).toBeVisible();
  });

  it('should default to en if language is not supported', async () => {
    i18next.changeLanguage('en-unknow-variant');

    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(Language.content, null),
          },
        ],
      },
    });

    const defaultLocale = screen.getByText(localeReadable('en'));
    expect(defaultLocale).toBeInTheDocument();
    expect(defaultLocale).toBeVisible();
  });

  it('should display supported language', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(Language.content, null),
          },
        ],
      },
    });

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText(testT('SETTINGS.LANGUAGE.ARIA_LABELS.SELECT'));
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    i18nLanguages.forEach((l) => {
      const option = within(ul).getByText(localeReadable(l));
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  // Unskip this test when more languages are supported
  it.skip('should change language when select', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: React.createElement(Language.content, null),
          },
        ],
      },
    });

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText(testT('SETTINGS.LANGUAGE.ARIA_LABELS.SELECT'));
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    const option = within(ul).getByText(localeReadable(i18nLanguages[1]));
    expect(option).toBeInTheDocument();
    expect(option).toBeVisible();

    await act(async () => {
      await user.click(option);
    });

    const defaultLocale = screen.getByText(localeReadable(i18nLanguages[1]));
    expect(defaultLocale).toBeInTheDocument();
    expect(defaultLocale).toBeVisible();
  });
});
