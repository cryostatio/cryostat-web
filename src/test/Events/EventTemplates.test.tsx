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
import { MessageMeta, MessageType, NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { EventTemplates } from '@app/Events/EventTemplates';
import { Events } from '@app/Events/Events';
import userEvent from '@testing-library/user-event';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

const mockMessageType = {type: "application", subtype: "json"} as MessageType;

const mockCustomEventTemplate: EventTemplate = {
    name: 'someEventTemplate',
    description: 'Some Description',
    provider: 'Cryostat',
    type: 'CUSTOM'
};

const mockAnotherTemplate = {...mockCustomEventTemplate, name: 'anotherEventTemplate'}

const mockCreateTemplateNotification = { 
  meta: {
    category: 'TemplateCreated',
    type: mockMessageType
  } as MessageMeta,
  message: { 
    template: mockAnotherTemplate 
  } 
} as NotificationMessage;
const mockDeleteTemplateNotification = 
{...mockCreateTemplateNotification, 
  meta: {
  category: 'TemplateDeleted',
  type: mockMessageType
  }
};

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
jest.spyOn(defaultServices.api, 'downloadTemplate').mockReturnValue();

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockCustomEventTemplate]));

jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders correctly
  .mockReturnValueOnce(of())
  
  .mockReturnValueOnce(of(mockCreateTemplateNotification)) // adds a template after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockDeleteTemplateNotification)) // removes a template after receiving a notification
  .mockReturnValue(of()); // all other tests

  describe('<EventTemplates />', () => {
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

    it('adds a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );

      expect(screen.getByText('someEventTemplate')).toBeInTheDocument();
      expect(screen.getByText('anotherEventTemplate')).toBeInTheDocument();
    });

    it('removes a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );
      expect(screen.queryByText('anotherEventTemplate')).not.toBeInTheDocument();
    });

    it('displays the column header fields', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument(); 
    });

    it('shows a popup when uploading', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );
      expect(screen.queryByLabelText('Create Custom Event Template')).not.toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      const uploadButton = buttons[0];
      userEvent.click(uploadButton);

      expect(screen.getByLabelText('Create Custom Event Template'));

    });

    it('downloads an event template when Download is clicked on template action bar', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );

      userEvent.click(screen.getByLabelText('Actions'));
      userEvent.click(screen.getByText('Download'));

      const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadTemplate');

      expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
      expect(downloadRequestSpy).toBeCalledWith(mockCustomEventTemplate);
    });

    it('shows a popup when Delete is clicked and then deletes the template after clicking confirmation Delete', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <EventTemplates />
        </ServiceContext.Provider>
      );
   
      userEvent.click(screen.getByLabelText('Actions'));

      expect(screen.getByText('Create Recording...'));
      expect(screen.getByText('Download'));
      expect(screen.getByText('Delete'));

      const deleteAction = screen.getByText('Delete');
      userEvent.click(deleteAction);

      expect(screen.getByLabelText('Event template delete warning'));

      const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomEventTemplate');
      userEvent.click(within(screen.getByLabelText("Event template delete warning")).getByText('Delete'));

      expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
      expect(deleteRequestSpy).toBeCalledWith('someEventTemplate');;
    });
  });
