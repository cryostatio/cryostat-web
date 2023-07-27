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
import { UserSetting } from '@app/Settings/SettingsUtils';
import { SessionState } from '@app/Shared/Services/Login.service';

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
    authenticated: true,
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
jest
  .spyOn(defaultServices.login, 'getSessionState')
  .mockReturnValueOnce(of(SessionState.NO_USER_SESSION)) // render correctly
  .mockReturnValueOnce(of(SessionState.NO_USER_SESSION)) // should not show settings that require authentication when the user is logged out
  .mockReturnValue(of(SessionState.USER_SESSION));

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

  it('should not show setting that requires authentication when the user is logged out', async () => {
    const { user } = renderWithServiceContextAndRouter(<Settings />);

    const dashboardTab = screen.getByRole('tab', { name: testT('SETTINGS.CATEGORIES.DASHBOARD') });
    expect(dashboardTab).toBeInTheDocument();
    expect(dashboardTab).toBeVisible();
    expect(dashboardTab.getAttribute('aria-selected')).toBe('false');

    await user.click(dashboardTab);

    expect(dashboardTab.getAttribute('aria-selected')).toBe('true');

    const dashboardSettings = screen.queryByText('Automated Analysis Config Component');
    expect(dashboardSettings).not.toBeInTheDocument();
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
