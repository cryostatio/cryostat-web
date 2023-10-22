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

import { Settings } from '@app/Settings/Settings';
import { UserSetting } from '@app/Settings/types';
import { FeatureLevel, SessionState } from '@app/Shared/Services/service.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { Text } from '@patternfly/react-core';
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { renderSnapshot, render, testT } from '../utils';

jest.mock('@app/Settings/Config/NotificationControl', () => ({
  NotificationControl: {
    titleKey: 'SETTINGS.NOTIFICATION_CONTROL.TITLE',
    descConstruct: 'SETTINGS.NOTIFICATION_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
    content: () => <Text>Notification Control Component</Text>,
    orderInGroup: 1,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/AutomatedAnalysis', () => ({
  AutomatedAnalysis: {
    titleKey: 'SETTINGS.AUTOMATED_ANALYSIS_CONFIG.TITLE',
    descConstruct: 'SETTINGS.AUTOMATED_ANALYSIS_CONFIG.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.DASHBOARD',
    content: () => <Text>Automated Analysis Config Component</Text>,
    authenticated: true,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/ChartCards', () => ({
  ChartCards: {
    titleKey: 'SETTINGS.CHARTS_CONFIG.TITLE',
    descConstruct: 'SETTINGS.CHARTS_CONFIG.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.DASHBOARD',
    content: () => <Text>Chart Cards Config Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/CredentialsStorage', () => ({
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

jest.mock('@app/Settings/Config/DeletionDialogControl', () => ({
  DeletionDialogControl: {
    titleKey: 'SETTINGS.DELETION_DIALOG_CONTROL.TITLE',
    descConstruct: 'SETTINGS.DELETION_DIALOG_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
    content: () => <Text>Deletion Dialog Control Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/WebSocketDebounce', () => ({
  WebSocketDebounce: {
    titleKey: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.TITLE',
    descConstruct: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.CONNECTIVITY',
    content: () => <Text>WebSocket Debounce Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/AutoRefresh', () => ({
  AutoRefresh: {
    titleKey: 'SETTINGS.AUTO_REFRESH.TITLE',
    descConstruct: 'SETTINGS.AUTO_REFRESH.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.CONNECTIVITY',
    content: () => <Text>AutoRefresh Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/FeatureLevels', () => ({
  FeatureLevels: {
    titleKey: 'SETTINGS.FEATURE_LEVEL.TITLE',
    descConstruct: 'SETTINGS.FEATURE_LEVEL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.ADVANCED',
    content: () => <Text>Feature Levels Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/Language', () => ({
  Language: {
    titleKey: 'SETTINGS.LANGUAGE.TITLE',
    descConstruct: 'SETTINGS.LANGUAGE.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    featureLevel: 1,
    orderInGroup: 1,
    content: () => <Text>Language Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/DatetimeControl', () => ({
  DatetimeControl: {
    titleKey: 'SETTINGS.DATETIME_CONTROL.TITLE',
    descConstruct: 'SETTINGS.DATETIME_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    content: () => <Text>DatetimeControl Component</Text>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/Theme', () => ({
  Theme: {
    titleKey: 'SETTINGS.THEME.TITLE',
    descConstruct: 'SETTINGS.THEME.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    content: () => <Text>Theme Component</Text>,
  } as UserSetting,
}));

jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
jest
  .spyOn(defaultServices.login, 'getSessionState')
  .mockReturnValueOnce(of(SessionState.NO_USER_SESSION)) // render correctly
  .mockReturnValueOnce(of(SessionState.NO_USER_SESSION)) // should not show settings that require authentication when the user is logged out
  .mockReturnValue(of(SessionState.USER_SESSION));

describe('<Settings/>', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should not show setting that requires authentication when the user is logged out', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    });

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
    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    });

    const hiddenTab = screen.queryByText(testT('SETTINGS.CATEGORIES.GENERAL'));
    expect(hiddenTab).not.toBeInTheDocument();
  });

  it('should select General tab as default', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    });

    const generalTab = screen.getByRole('tab', { name: testT('SETTINGS.CATEGORIES.GENERAL') });
    expect(generalTab).toBeInTheDocument();
    expect(generalTab).toBeVisible();
    expect(generalTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should update setting content when a tab is selected', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    });

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
