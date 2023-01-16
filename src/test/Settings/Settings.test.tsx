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
import { renderWithServiceContextAndRouter } from '../Common';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

jest.mock('@app/Settings/NotificationControl', () => ({
  NotificationControl: {
    title: 'Notification Control Title',
    description: 'Notification Control Description',
    category: 'Notifications & Messages',
    content: () => <Text>Notification Control Component</Text>,
  },
}));

jest.mock('@app/Settings/AutomatedAnalysisConfig', () => ({
  AutomatedAnalysisConfig: {
    title: 'Automated Analysis Config Title',
    description: 'Automated Analysis Config Description',
    category: 'Dashboard',
    content: () => <Text>Automated Analysis Config Component</Text>,
  },
}));

jest.mock('@app/Settings/CredentialsStorage', () => ({
  CredentialsStorage: {
    title: 'Credentials Storage Title',
    description: 'Credentials Storage Description',
    category: 'Advanced',
    content: () => <Text>Credentials Storage Component</Text>,
  },
}));

jest.mock('@app/Settings/DeletionDialogControl', () => ({
  DeletionDialogControl: {
    title: 'Deletion Dialog Control Title',
    description: 'Deletion Dialog Control Description',
    category: 'Notifications & Messages',
    content: () => <Text>Deletion Dialog Control Component</Text>,
  },
}));

jest.mock('@app/Settings/WebSocketDebounce', () => ({
  WebSocketDebounce: {
    title: 'WebSocket Debounce Title',
    description: 'WebSocket Debounce Description',
    category: 'Connectivity',
    content: () => <Text>WebSocket Debounce Component</Text>,
  },
}));

jest.mock('@app/Settings/AutoRefresh', () => ({
  AutoRefresh: {
    title: 'AutoRefresh Title',
    description: 'AutoRefresh Description',
    category: 'Connectivity',
    content: () => <Text>AutoRefresh Component</Text>,
  },
}));

jest.mock('@app/Settings/FeatureLevels', () => ({
  FeatureLevels: {
    title: 'Feature Levels Title',
    description: 'Feature Levels Description',
    category: 'Advanced',
    content: () => <Text>Feature Levels Component</Text>,
  },
}));

jest.mock('@app/Settings/Language', () => ({
  Language: {
    title: 'Language Title',
    description: 'Language Description',
    category: 'Language & Region',
    featureLevel: FeatureLevel.BETA,
    content: () => <Text>Language Component</Text>,
  },
}));

jest.spyOn(defaultServices.settings, 'featureLevel').mockReturnValue(of(FeatureLevel.PRODUCTION));

const history = createMemoryHistory({ initialEntries: ['/settings'] });

describe.skip('<Settings/>', () => {
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

  // This test will check if language setting (BETA) is being hidden.
  // Update this test when language setting is in PRODUCTION.
  it('should not show tabs with featureLevel lower than current', async () => {
    renderWithServiceContextAndRouter(<Settings />);

    const hiddenTab = screen.queryByText('Language & Region');
    expect(hiddenTab).not.toBeInTheDocument();
  });

  it('should select Connectivity tab as default', async () => {
    renderWithServiceContextAndRouter(<Settings />);

    const generalTab = screen.getByRole('tab', { name: 'Connectivity' });
    expect(generalTab).toBeInTheDocument();
    expect(generalTab).toBeVisible();
    expect(generalTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should update setting content when a tab is selected', async () => {
    const { user } = renderWithServiceContextAndRouter(<Settings />);

    const dashboardTab = screen.getByRole('tab', { name: 'Dashboard' });
    expect(dashboardTab).toBeInTheDocument();
    expect(dashboardTab).toBeVisible();
    expect(dashboardTab.getAttribute('aria-selected')).toBe('false');

    await user.click(dashboardTab);

    expect(dashboardTab.getAttribute('aria-selected')).toBe('true');
  });
});
