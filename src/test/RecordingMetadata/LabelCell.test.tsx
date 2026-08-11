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
import { defaultServices } from '@app/Shared/Services/Services';
import dayjs, { defaultDatetimeFormat } from '@i18n/datetime';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { render } from '../utils';

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

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

const mockLabel: KeyValue = { key: 'someLabel', value: 'someValue' };
const mockAnotherLabel: KeyValue = { key: 'anotherLabel', value: 'anotherValue' };
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
    const { container } = render({
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
    expect(container).toMatchSnapshot();
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
      const displayedLabel = screen.getByText(labelAsString);

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
      const displayedLabel = screen.getByText(labelAsString);

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

    const placeHolder = screen.getByText('No labels');
    expect(placeHolder).toBeInTheDocument();
    expect(placeHolder).toBeVisible();
    expect(placeHolder.onclick).toBeNull();
  });

  it('should format startTime label as a human-readable datetime', async () => {
    const startTimeMillis = 1782483737600;
    const startTimeLabel: KeyValue = { key: 'startTime', value: String(startTimeMillis) };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <LabelCell target={mockFooTarget.connectUrl} labels={[startTimeLabel]} />,
          },
        ],
      },
    });

    const expectedText = `startTime=${dayjs(startTimeMillis).tz(defaultDatetimeFormat.timeZone.full).format('L LTS z')}`;
    const displayedLabel = screen.getByText(expectedText);
    expect(displayedLabel).toBeInTheDocument();
    expect(displayedLabel).toBeVisible();
  });

  it('should format duration label as a humanized duration string', async () => {
    const durationLabel: KeyValue = { key: 'duration', value: '90203' };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <LabelCell target={mockFooTarget.connectUrl} labels={[durationLabel]} />,
          },
        ],
      },
    });

    const displayedLabel = screen.getByText(/^duration=/);
    expect(displayedLabel).toBeInTheDocument();
    expect(displayedLabel).toBeVisible();
    expect(displayedLabel.textContent).not.toBe('duration=90203');
  });

  it('should fall back to raw value for startTime label with non-numeric value', async () => {
    const badLabel: KeyValue = { key: 'startTime', value: 'not-a-timestamp' };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <LabelCell target={mockFooTarget.connectUrl} labels={[badLabel]} />,
          },
        ],
      },
    });

    const displayedLabel = screen.getByText('startTime=not-a-timestamp');
    expect(displayedLabel).toBeInTheDocument();
    expect(displayedLabel).toBeVisible();
  });
});
