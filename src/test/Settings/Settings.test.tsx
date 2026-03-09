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
import { Settings } from '@app/Settings/Settings';
import { Palette, UserSetting } from '@app/Settings/types';
import { FeatureLevel, SessionState } from '@app/Shared/Services/service.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { Content } from '@patternfly/react-core';
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { render, testT } from '../utils';

jest.mock('@app/Settings/Config/NotificationControl', () => ({
  NotificationControl: {
    titleKey: 'SETTINGS.NOTIFICATION_CONTROL.TITLE',
    descConstruct: 'SETTINGS.NOTIFICATION_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
    content: () => <Content component="p">Notification Control Component</Content>,
    orderInGroup: 1,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/ChartCards', () => ({
  ChartCards: {
    titleKey: 'SETTINGS.CHARTS_CONFIG.TITLE',
    descConstruct: 'SETTINGS.CHARTS_CONFIG.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.DASHBOARD',
    content: () => <Content component="p">Chart Cards Config Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/DeletionDialogControl', () => ({
  DeletionDialogControl: {
    titleKey: 'SETTINGS.DELETION_DIALOG_CONTROL.TITLE',
    descConstruct: 'SETTINGS.DELETION_DIALOG_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.NOTIFICATION_MESSAGE',
    content: () => <Content component="p">Deletion Dialog Control Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/WebSocketDebounce', () => ({
  WebSocketDebounce: {
    titleKey: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.TITLE',
    descConstruct: 'SETTINGS.WEBSOCKET_CONNECTION_DEBOUNCE.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.CONNECTIVITY',
    content: () => <Content component="p">WebSocket Debounce Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/AutoRefresh', () => ({
  AutoRefresh: {
    titleKey: 'SETTINGS.AUTO_REFRESH.TITLE',
    descConstruct: 'SETTINGS.AUTO_REFRESH.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.CONNECTIVITY',
    content: () => <Content component="p">AutoRefresh Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/FeatureLevels', () => ({
  FeatureLevels: {
    titleKey: 'SETTINGS.FEATURE_LEVEL.TITLE',
    descConstruct: 'SETTINGS.FEATURE_LEVEL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.ADVANCED',
    content: () => <Content component="p">Feature Levels Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/Language', () => ({
  Language: {
    titleKey: 'SETTINGS.LANGUAGE.TITLE',
    descConstruct: 'SETTINGS.LANGUAGE.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    featureLevel: 1,
    orderInGroup: 1,
    content: () => <Content component="p">Language Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/DatetimeControl', () => ({
  DatetimeControl: {
    titleKey: 'SETTINGS.DATETIME_CONTROL.TITLE',
    descConstruct: 'SETTINGS.DATETIME_CONTROL.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    content: () => <Content component="p">DatetimeControl Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/Theme', () => ({
  Theme: {
    titleKey: 'SETTINGS.THEME.TITLE',
    descConstruct: 'SETTINGS.THEME.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    content: () => <Content component="p">Theme Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/TopologyConfig', () => ({
  TopologyConfig: {
    titleKey: 'SETTINGS.TOPOLOGY.TITLE',
    descConstruct: 'SETTINGS.TOPOLOGY.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.TOPOLOGY',
    content: () => <Content component="p">Topology Component</Content>,
  } as UserSetting,
}));

jest.mock('@app/Settings/Config/Accessibility', () => ({
  Accessibility: {
    titleKey: 'SETTINGS.ACCESSIBILITY.TITLE',
    descConstruct: 'SETTINGS.ACCESSIBILITY.DESCRIPTION',
    category: 'SETTINGS.CATEGORIES.GENERAL',
    content: () => <Content component="p">Accessibility Component</Content>,
  } as UserSetting,
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
jest.spyOn(defaultServices.settings, 'palette').mockReturnValue(of(Palette.DEFAULT));
jest.spyOn(defaultServices.settings, 'largeUi').mockReturnValue(of(false));
jest
  .spyOn(defaultServices.login, 'getSessionState')
  .mockReturnValueOnce(of(SessionState.NO_USER_SESSION)) // render correctly
  .mockReturnValueOnce(of(SessionState.NO_USER_SESSION)) // should not show settings that require authentication when the user is logged out
  .mockReturnValue(of(SessionState.USER_SESSION));

describe('<Settings />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    });
    expect(container).toMatchSnapshot();
  });

  // useNavigate() is mocked. Can't switch tab
  it.skip('should not show setting that requires authentication when the user is logged out', async () => {
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

  it('should not display DEVELOPMENT settings when PRODUCTION is selected', async () => {
    // https://github.com/cryostatio/cryostat-web/issues/1640
    // Change the feature level of the Language setting to DEVELOPMENT, and ensure the component doesn't display in PRODUCTION
    Language.featureLevel = FeatureLevel.DEVELOPMENT;
    jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));
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
    expect(() => screen.getByText('Language Component')).toThrow();
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

  // useNavigate() is mocked. Can't switch tab
  it.skip('should update setting content when a tab is selected', async () => {
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
  });
});
