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
import { authFailMessage } from '@app/ErrorView/types';
import { EventTypes } from '@app/Events/EventTypes';
import { EventType, Target } from '@app/Shared/Services/api.types';
import { ServiceContext, defaultServices, Services } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import { act as doAct, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { of, Subject } from 'rxjs';
import { render, renderSnapshot } from '../utils';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = {
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: 'foo',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockEventType: EventType = {
  name: 'Some Event',
  typeId: 'org.some_eventId',
  description: 'Some Descriptions',
  category: ['Category 1', 'Category 2'],
  options: [{ some_key: { name: 'some_name', description: 'a_desc', defaultValue: 'some_value' } }],
};

jest.spyOn(defaultServices.api, 'doGet').mockReturnValue(of([mockEventType]));
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

describe('<EventTypes />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTypes />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should show error view if failing to retrieve event types', async () => {
    const subj = new Subject<void>();
    const mockTargetSvc = {
      target: () => of(mockTarget as Target),
      authFailure: () => subj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTypes />,
          },
        ],
      },
      providers: [{ kind: ServiceContext.Provider, instance: services }],
    });

    await doAct(async () => subj.next());

    const failTitle = screen.getByText('Error retrieving event types');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText(authFailMessage);
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeVisible();
  });

  it('should shown empty state when table is empty', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/events',
            element: <EventTypes />,
          },
        ],
      },
    });

    const filterInput = screen.getByLabelText('Event filter');
    expect(filterInput).toBeInTheDocument();
    expect(filterInput).toBeVisible();

    await user.type(filterInput, 'someveryoddname');

    expect(screen.queryByText('Some Event')).not.toBeInTheDocument();

    const hintText = screen.getByText('No Event Types');
    expect(hintText).toBeInTheDocument();
    expect(hintText).toBeVisible();
  });
});
