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
import { EventTemplate, ProbeTemplate } from '@app/Shared/Services/Api.service';
import { MessageMeta, MessageType, NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext, defaultServices } from '@app/Shared/Services/Services';
import { EventTemplates } from '@app/Events/EventTemplates';
import userEvent from '@testing-library/user-event';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { AgentProbeTemplates } from '@app/Agent/AgentProbeTemplates';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

const mockMessageType = {type: "application", subtype: "json"} as MessageType;

const mockCustomEventTemplate: ProbeTemplate = {
    name: 'someProbeTemplate',
    xml: '<some><dummy><xml></xml></dummy></some>'
};

const mockAnotherTemplate = {...mockCustomEventTemplate, name: 'anotherProbeTemplate'}

const mockCreateTemplateNotification = { 
  meta: {
    category: 'ProbeTemplateUploaded',
    type: mockMessageType
  } as MessageMeta,
  message: { 
    template: mockAnotherTemplate 
  } 
} as NotificationMessage;
const mockDeleteTemplateNotification = 
{...mockCreateTemplateNotification, 
  meta: {
  category: 'ProbeTemplateDeleted',
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

jest.spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // show deletion warning
  .mockReturnValue(false); // don't ask again

jest.spyOn(defaultServices.api, 'addCustomProbeTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'insertProbes').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'removeProbes').mockReturnValue(of(true));

jest.spyOn(defaultServices.api, 'getProbeTemplates').mockReturnValue(of([mockCustomEventTemplate]));

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
            <AgentProbeTemplates />
          </ServiceContext.Provider>
        );
      });
      expect(tree.toJSON()).toMatchSnapshot();
    });

    it('adds a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <AgentProbeTemplates />
        </ServiceContext.Provider>
      );

      expect(screen.getByText('someEventTemplate')).toBeInTheDocument();
      expect(screen.getByText('anotherEventTemplate')).toBeInTheDocument();
    });

    it('removes a recording after receiving a notification', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <AgentProbeTemplates />
        </ServiceContext.Provider>
      );
      expect(screen.queryByText('anotherEventTemplate')).not.toBeInTheDocument();
    });

    it('displays the column header fields', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <AgentProbeTemplates />
        </ServiceContext.Provider>
      );
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('xml')).toBeInTheDocument();
    });

    it('shows a popup when uploading', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <AgentProbeTemplates />
        </ServiceContext.Provider>
      );
      expect(screen.queryByLabelText('Create Custom Probe Template')).not.toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      const uploadButton = buttons[0];
      userEvent.click(uploadButton);

      expect(screen.getByLabelText('Create Custom Probe Template'));

    });

    it('Tests that delete works correctly', () => {
      render(
        <ServiceContext.Provider value={defaultServices}>
          <AgentProbeTemplates />
        </ServiceContext.Provider>
      );
   
      userEvent.click(screen.getByLabelText('Actions'));

      expect(screen.getByText('Insert Probes...'));
      expect(screen.getByText('Delete'));

      const deleteAction = screen.getByText('Delete');
      userEvent.click(deleteAction);

      expect(screen.getByLabelText('Event template delete warning'));

      const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteCustomProbeTemplate');

      expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
      expect(deleteRequestSpy).toBeCalledWith('someEventTemplate');;
    });
  });
