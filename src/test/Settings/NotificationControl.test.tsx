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
import { NotificationControl } from '@app/Settings/NotificationControl';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { defaultServices, ServiceContext } from '@app/Shared/Services/Services';
import { act as doAct, cleanup, screen } from '@testing-library/react';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { BehaviorSubject } from 'rxjs';
import { renderWithServiceContext, testT } from '../Common';

const defaultNumOfNotifications = 5;
const defaults = new Map<NotificationCategory, boolean>();
for (const cat in NotificationCategory) {
  defaults.set(NotificationCategory[cat], true);
}

const notiCountSubj = new BehaviorSubject<number>(defaultNumOfNotifications);

jest.spyOn(defaultServices.settings, 'notificationsEnabled').mockReturnValue(defaults);
jest.spyOn(defaultServices.settings, 'visibleNotificationsCount').mockReturnValue(notiCountSubj.asObservable());
jest
  .spyOn(defaultServices.settings, 'setVisibleNotificationCount')
  .mockImplementation((c) => doAct(() => notiCountSubj.next(c)));

describe('<NotificationControl/>', () => {
  beforeEach(() => {
    jest.mocked(defaultServices.settings.notificationsEnabled).mockClear();
    jest.mocked(defaultServices.settings.visibleNotificationsCount).mockClear();
    jest.mocked(defaultServices.settings.setVisibleNotificationCount).mockClear();
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          {React.createElement(NotificationControl.content, null)}
        </ServiceContext.Provider>,
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should default to enable all notifications', async () => {
    renderWithServiceContext(React.createElement(NotificationControl.content, null));

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.NOTIFICATION_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();
  });

  it('should default to correct max number of notification alerts', async () => {
    renderWithServiceContext(React.createElement(NotificationControl.content, null));

    const maxInput = document.querySelector("input[type='number']");
    expect(maxInput).toBeInTheDocument();
    expect(maxInput).toBeVisible();

    expect(maxInput?.getAttribute('value')).toBe(`${defaultNumOfNotifications}`);
  });

  it('should save to local storage when max number of alerts is changed', async () => {
    const { user } = renderWithServiceContext(React.createElement(NotificationControl.content, null));

    const maxInput = document.querySelector("input[type='number']");
    expect(maxInput).toBeInTheDocument();
    expect(maxInput).toBeVisible();

    expect(maxInput?.getAttribute('value')).toBe(`${defaultNumOfNotifications}`);

    const plusButton = screen.getByLabelText('Plus');
    expect(plusButton).toBeInTheDocument();
    expect(plusButton).toBeVisible();

    await doAct(async () => {
      await user.click(plusButton);
    });

    expect(maxInput?.getAttribute('value')).toBe(`${defaultNumOfNotifications + 1}`);
  });

  it('should turn off enable-all switch if any child switch is off', async () => {
    const { user } = renderWithServiceContext(React.createElement(NotificationControl.content, null));

    const enableSwitch = screen.getByLabelText(testT('SETTINGS.NOTIFICATION_CONTROL.SWITCH_LABEL'));
    expect(enableSwitch).toBeInTheDocument();
    expect(enableSwitch).toBeVisible();
    expect(enableSwitch).toBeChecked();

    const expandButton = screen.getByText('Show more');
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toBeVisible();

    await user.click(expandButton);

    const webSocketAct = screen.getByLabelText('WebSocket Client Activity');
    expect(webSocketAct).toBeInTheDocument();
    expect(webSocketAct).toBeVisible();
    expect(webSocketAct).toBeChecked();

    await user.click(webSocketAct);

    expect(webSocketAct).not.toBeChecked();
    expect(enableSwitch).not.toBeChecked();
  });
});
