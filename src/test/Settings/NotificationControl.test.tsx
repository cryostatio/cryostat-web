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
        </ServiceContext.Provider>
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
