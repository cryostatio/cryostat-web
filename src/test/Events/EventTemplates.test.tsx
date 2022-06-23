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
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of } from 'rxjs';
import { EventTemplate } from '@app/Shared/Services/Api.service';
import { NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { EventTemplates } from '@app/Events/EventTemplates';
import { Events } from '@app/Events/Events';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

const mockCustomEventTemplate: EventTemplate = {
    name: 'someEventTemplate',
    description: 'Some Description',
    provider: 'Cryostat',
    type: 'CUSTOM'
};

const mockCreateCustomEventTemplate = { message: { template: mockCustomEventTemplate } } as NotificationMessage;

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: '/baseUrl' }),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));


jest.spyOn(defaultServices.api, 'addCustomEventTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate').mockReturnValue(of(true));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockCreateCustomEventTemplate)) // renders correctly
  .mockReturnValue(of()); // all other tests

  describe('<EventTemplates />', () => {
    // beforeEach(() => {
    // //   mockRecording.metadata.labels = mockRecordingLabels;
    // //   mockRecording.state = RecordingState.RUNNING;
    // });

    it('renders correctly', async () => {
      let tree;
      await act(async () => {
        tree = renderer.create(
          <ServiceContext.Provider value={defaultServices}>
            <EventTemplates />
          </ServiceContext.Provider>
        );
      });
      expect(tree.toJSON()).toMatchSnapshot();
    });

    // it shows a popup window
    it('deletes a recording when Delete is clicked', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );

      screen.logTestingPlaygroundURL()

    });

  });
