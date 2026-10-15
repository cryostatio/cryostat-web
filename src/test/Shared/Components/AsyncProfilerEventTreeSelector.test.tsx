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
import { AsyncProfilerEventTreeSelector } from '@app/Shared/Components/AsyncProfilerEventTreeSelector';
import { Target } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import { screen, cleanup } from '@testing-library/react';
import { of } from 'rxjs';
import { render } from '../../utils';

const mockTarget: Target = {
  agent: true,
  connectUrl: 'http://agent-target:9977/api/v1',
  alias: 'agentTarget',
  jvmId: 'bar',
  labels: [],
  annotations: { cryostat: [], platform: [] },
};

const mockAvailableEvents = {
  cpu: ['cpu:Execution', 'cpu:Allocation'],
  lock: ['lock:Monitor'],
};

describe('<AsyncProfilerEventTreeSelector />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents')
      .mockReturnValue(of(mockAvailableEvents as unknown as string[]));
  });

  afterEach(cleanup);

  it('renders available event categories', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: (
              <AsyncProfilerEventTreeSelector
                target={mockTarget}
                chosenLeafIds={[]}
                onChosenLeafIdsChange={jest.fn()}
              />
            ),
          },
        ],
      },
    });

    expect(await screen.findByText('cpu')).toBeInTheDocument();
    expect(await screen.findByText('lock')).toBeInTheDocument();
  });

  it('renders both available and chosen panes', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: (
              <AsyncProfilerEventTreeSelector
                target={mockTarget}
                chosenLeafIds={[]}
                onChosenLeafIdsChange={jest.fn()}
              />
            ),
          },
        ],
      },
    });

    expect(await screen.findByText('Available events')).toBeInTheDocument();
    expect(screen.getByText('Chosen events')).toBeInTheDocument();
  });

  it('does not fetch events when target is undefined', async () => {
    const spy = jest.spyOn(defaultServices.api, 'getAsyncProfilerAvailableEvents');

    render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: (
              <AsyncProfilerEventTreeSelector target={undefined} chosenLeafIds={[]} onChosenLeafIdsChange={jest.fn()} />
            ),
          },
        ],
      },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('calls onChosenLeafIdsChange when add-all is clicked', async () => {
    const onChange = jest.fn();

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/',
            element: (
              <AsyncProfilerEventTreeSelector target={mockTarget} chosenLeafIds={[]} onChosenLeafIdsChange={onChange} />
            ),
          },
        ],
      },
    });

    const addAll = await screen.findByRole('button', { name: /add all/i });
    await user.click(addAll);

    expect(onChange).toHaveBeenCalledTimes(1);
    const args: string[] = onChange.mock.calls[0][0];
    expect(args.length).toBeGreaterThan(0);
  });
});
