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

import { LabelCell } from '@app/RecordingMetadata/LabelCell';
import { UpdateFilterOptions } from '@app/Shared/Redux/Filters/Common';
import { KeyValue, Target } from '@app/Shared/Services/api.types';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, renderSnapshot } from '../utils';

const mockFooTarget: Target = {
  agent: false,
  connectUrl: 'service:jmx:rmi://someFooUrl',
  alias: 'fooTarget',
  labels: [],
  annotations: {
    cryostat: [],
    platform: [],
  },
};

const mockLabel = { key: 'someLabel', value: 'someValue' } as KeyValue;
const mockAnotherLabel = { key: 'anotherLabel', value: 'anotherValue' } as KeyValue;
const mockLabelList = [mockLabel, mockAnotherLabel];

// For display
const mockLabelStringList = [
  `${mockLabel.key}=${mockLabel.value}`,
  `${mockAnotherLabel.key}=${mockAnotherLabel.value}`,
];

describe('<LabelCell />', () => {
  let onUpdateLabels: (target: string, updateFilterOptions: UpdateFilterOptions) => void;
  beforeEach(() => {
    onUpdateLabels = jest.fn((_target: string, _options: UpdateFilterOptions) => undefined);
  });

  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <LabelCell
                target={mockFooTarget.connectUrl}
                labels={mockLabelList}
                clickableOptions={{ labelFilters: [], updateFilters: onUpdateLabels }}
              />
            ),
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
  });

  it('should display read-only Labels', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <LabelCell target={mockFooTarget.connectUrl} labels={mockLabelList} />,
          },
        ],
      },
    });

    for (const labelAsString of mockLabelStringList) {
      const displayedLabel = screen.getByLabelText(labelAsString);

      expect(displayedLabel).toBeInTheDocument();
      expect(displayedLabel).toBeVisible();

      expect(displayedLabel.onclick).toBeNull();

      await userEvent.click(displayedLabel);
      expect(onUpdateLabels).not.toHaveBeenCalled();
    }
  });

  it('should display clickable Labels', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: (
              <LabelCell
                target={mockFooTarget.connectUrl}
                labels={mockLabelList}
                clickableOptions={{ labelFilters: [], updateFilters: onUpdateLabels }}
              />
            ),
          },
        ],
      },
    });

    let count = 0;
    let index = 0;
    for (const labelAsString of mockLabelStringList) {
      const displayedLabel = screen.getByLabelText(labelAsString);

      expect(displayedLabel).toBeInTheDocument();
      expect(displayedLabel).toBeVisible();

      await userEvent.click(displayedLabel);

      expect(onUpdateLabels).toHaveBeenCalledTimes(++count);
      expect(onUpdateLabels).toHaveBeenCalledWith(mockFooTarget.connectUrl, {
        filterKey: 'Label',
        filterValue: mockLabelStringList[index],
        deleted: false,
      });
      index++;
    }
  });

  it('should display placeholder when there is no label', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <LabelCell target={mockFooTarget.connectUrl} labels={[]} />,
          },
        ],
      },
    });

    const placeHolder = screen.getByText('-');
    expect(placeHolder).toBeInTheDocument();
    expect(placeHolder).toBeVisible();
    expect(placeHolder.onclick).toBeNull();
  });
});
