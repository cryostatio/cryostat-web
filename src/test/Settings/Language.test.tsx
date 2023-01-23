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

import { Language } from '@app/Settings/Language';
import i18next, { i18nLanguages } from '@i18n/config';
import { localeReadable } from '@i18n/i18nextUtil';
import { act, cleanup, screen, within } from '@testing-library/react';
import * as React from 'react';
import { renderDefault } from '../Common';

jest.mock('@i18n/config', () => ({
  ...jest.requireActual('@i18n/config'),
  __esModule: true,
  i18nResources: {
    en: {
      public: {},
      common: {},
    },
    zh: {
      public: {},
      common: {},
    },
  },
  i18nLanguages: ['en', 'zh'],
}));

describe('<Language/>', () => {
  afterEach(cleanup);

  it('should default to detected language or default en', async () => {
    renderDefault(React.createElement(Language.content, null));

    const defaultLocale = screen.getByText(localeReadable(i18next.language));
    expect(defaultLocale).toBeInTheDocument();
    expect(defaultLocale).toBeVisible();
  });

  it('should display supported language', async () => {
    const { user } = renderDefault(React.createElement(Language.content, null));

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText('Select a language');
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    i18nLanguages.forEach((l) => {
      const option = within(ul).getByText(localeReadable(l));
      expect(option).toBeInTheDocument();
      expect(option).toBeVisible();
    });
  });

  it('should change language when select', async () => {
    const { user } = renderDefault(React.createElement(Language.content, null));

    const optionMenu = screen.getByLabelText('Options menu');
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText('Select a language');
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
