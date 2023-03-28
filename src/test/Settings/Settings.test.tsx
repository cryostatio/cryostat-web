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

// Must import before @app/Settings/Settings (circular deps)
/* eslint import/order: 0*/
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { Settings } from '@app/Settings/Settings';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { Text } from '@patternfly/react-core';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { of } from 'rxjs';
import { renderWithServiceContextAndRouter, testT } from '../Common';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { ThemeType, UserSetting } from '@app/Settings/SettingsUtils';

jest.mock('@app/Settings/NotificationControl', () => ({
  NotificationControl: {
    titleKey: 'SETTINGS.NOTIFICATION_CONTROL.TITLE',
    descConstruct: 'SETTINGS.NOTIFICATION_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
    content: () => <Text>Notification Control Component</Text>,
    orderInGroup: 1,
  } as UserSetting,
}));

jest.mock('@app/Settings/AutomatedAnalysisConfig', () => ({
  AutomatedAnalysisConfig: {
    titleKey: 'SETTINGS.AUTOMATED_ANALYSIS_CONFIG.TITLE',
    descConstruct: 'SETTINGS.AUTOMATED_ANALYSIS_CONFIG.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.DASHBOARD',
    content: () => <Text>Automated Analysis Config Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/ChartCardsConfig', () => ({
  ChartCardsConfig: {
    titleKey: 'SETTINGS.CHARTS_CONFIG.TITLE',
    descConstruct: 'SETTINGS.CHARTS_CONFIG.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.DASHBOARD',
    content: () => <Text>Chart Cards Config Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/CredentialsStorage', () => ({
  CredentialsStorage: {
    titleKey: 'SETTINGS.CREDENTIALS_STORAGE.TITLE',
    descConstruct: {
      key: 'SETTINGS.CREDENTIALS_STORAGE.DESCRIPTION',
      parts: [], // Just raw string (avoid using React component during mock)
    },
    category: 'SETTINGS.CATEGORIES.ADVANCED',
    content: () => <Text>Credentials Storage Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/DeletionDialogControl', () => ({
  DeletionDialogControl: {
    titleKey: 'SETTINGS.DELETION_DIALOG_CONTROL.TITLE',
    descConstruct: 'SETTINGS.DELETION_DIALOG_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
    content: () => <Text>Deletion Dialog Control Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/WebSocketDebounce', () => ({
  WebSocketDebounce: {
    titleKey: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.TITLE',
    descConstruct: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.CONNECTIVITY',
    content: () => <Text>WebSocket Debounce Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/AutoRefresh', () => ({
  AutoRefresh: {
    titleKey: 'SETTINGS.AUTO_REFRESH.TITLE',
    descConstruct: 'SETTINGS.AUTO_REFRESH.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.CONNECTIVITY',
    content: () => <Text>AutoRefresh Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/FeatureLevels', () => ({
  FeatureLevels: {
    titleKey: 'SETTINGS.FEATURE_LEVEL.TITLE',
    descConstruct: 'SETTINGS.FEATURE_LEVEL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.ADVANCED',
    content: () => <Text>Feature Levels Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Language', () => ({
  Language: {
    titleKey: 'SETTINGS.LANGUAGE.TITLE',
    descConstruct: 'SETTINGS.LANGUAGE.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    featureLevel: FeatureLevel.BETA,
    orderInGroup: 1,
    content: () => <Text>Language Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/DatetimeControl', () => ({
  DatetimeControl: {
    titleKey: 'SETTINGS.DATETIME_CONTROL.TITLE',
    descConstruct: 'SETTINGS.DATETIME_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    featureLevel: FeatureLevel.PRODUCTION,
    content: () => <Text>DatetimeControl Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Theme', () => ({
  Theme: {
    titleKey: 'SETTINGS.THEME.TITLE',
    descConstruct: 'SETTINGS.THEME.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    featureLevel: FeatureLevel.PRODUCTION,
    content: () => <Text>Theme Component</Text>,
  } as UserSetting,
}));

jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
jest.spyOn(defaultServices.settings, 'theme').mockReturnValue(of(ThemeType.DARK));

const history = createMemoryHistory({ initialEntries: ['/settings'] });

describe('<Settings/>', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <Router history={history}>
            <Settings />
          </Router>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  // Currently, no tab is lower than PRODUCTION
  it.skip('should not show tabs with featureLevel lower than current', async () => {
    renderWithServiceContextAndRouter(<Settings />);

    const hiddenTab = screen.queryByText(testT('SETTINGS.CATEGORIES.GENERAL'));
    expect(hiddenTab).not.toBeInTheDocument();
  });

  it('should select General tab as default', async () => {
    renderWithServiceContextAndRouter(<Settings />);

    const generalTab = screen.getByRole('tab', { name: testT('SETTINGS.CATEGORIES.GENERAL') });
    expect(generalTab).toBeInTheDocument();
    expect(generalTab).toBeVisible();
    expect(generalTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should update setting content when a tab is selected', async () => {
    const { user } = renderWithServiceContextAndRouter(<Settings />);

    const dashboardTab = screen.getByRole('tab', { name: testT('SETTINGS.CATEGORIES.DASHBOARD') });
    expect(dashboardTab).toBeInTheDocument();
    expect(dashboardTab).toBeVisible();
    expect(dashboardTab.getAttribute('aria-selected')).toBe('false');

    await user.click(dashboardTab);

    expect(dashboardTab.getAttribute('aria-selected')).toBe('true');

    const dashboardSettings = screen.getByText('Automated Analysis Config Component');
    expect(dashboardSettings).toBeInTheDocument();
    expect(dashboardSettings).toBeVisible();
  });
});
