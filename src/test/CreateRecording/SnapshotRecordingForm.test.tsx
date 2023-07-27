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

import { SnapshotRecordingForm } from '@app/CreateRecording/SnapshotRecordingForm';
import { authFailMessage } from '@app/ErrorView/ErrorView';
import { NotificationsContext, NotificationsInstance } from '@app/Notifications/Notifications';
import { ServiceContext, Services, defaultServices } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import { screen, cleanup, act as doAct } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { of, Subject } from 'rxjs';
import { renderWithServiceContext } from '../Common';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockTarget = { connectUrl: mockConnectUrl, alias: 'fooTarget' };

const history = createMemoryHistory({ initialEntries: ['/recordings/create'] });

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useRouteMatch: () => ({ url: history.location.pathname }),
  useHistory: () => history,
}));

jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'sslFailure').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'authRetry').mockReturnValue(of());

describe('<SnapshotRecordingForm />', () => {
  beforeEach(() => {
    history.go(-history.length);
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(
        <ServiceContext.Provider value={defaultServices}>
          <NotificationsContext.Provider value={NotificationsInstance}>
            <SnapshotRecordingForm />
          </NotificationsContext.Provider>
        </ServiceContext.Provider>
      );
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should create recording when create is clicked', async () => {
    const onCreateSpy = jest.spyOn(defaultServices.api, 'createSnapshot').mockReturnValue(of(true));
    const { user } = renderWithServiceContext(<SnapshotRecordingForm />);

    const createButton = screen.getByText('Create');
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeVisible();

    await user.click(createButton);

    expect(onCreateSpy).toHaveBeenCalledTimes(1);
    expect(history.entries.map((entry) => entry.pathname)).toStrictEqual(['/recordings/create', '/recordings']);
  });

  it('should show error view if failing to retrieve templates or recording options', async () => {
    const authSubj = new Subject<void>();
    const mockTargetSvc = {
      ...defaultServices.target,
      authFailure: () => authSubj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };
    renderWithServiceContext(<SnapshotRecordingForm />, { services: services });

    await doAct(async () => authSubj.next());

    const failTitle = screen.getByText('Error displaying recording creation form');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText(authFailMessage);
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeVisible();
  });
});
