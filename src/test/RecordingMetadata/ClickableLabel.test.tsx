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
import { ClickableLabel } from '@app/RecordingMetadata/ClickableLabel';
import '@testing-library/jest-dom';
import { Palette } from '@app/Settings/types';
import { KeyValue } from '@app/Shared/Services/api.types';
import { defaultServices } from '@app/Shared/Services/Services';
import dayjs, { defaultDatetimeFormat } from '@i18n/datetime';
import { cleanup, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { render } from '../utils';

const mockLabel: KeyValue = {
  key: 'someLabel',
  value: 'someValue',
};
const mockLabelAsString = 'someLabel=someValue';

const onLabelClick = jest.fn((_label: KeyValue) => {
  /**Do nothing. Used for checking renders */
});

jest.spyOn(defaultServices.settings, 'palette').mockReturnValue(of(Palette.DEFAULT));
jest.spyOn(defaultServices.settings, 'largeUi').mockReturnValue(of(false));
jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

describe('<ClickableLabel />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const { container } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={mockLabel} isSelected={true} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });
    expect(container).toMatchSnapshot();
  });

  it('should display blue when the label is currently selected', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={mockLabel} isSelected={true} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });

    const label = screen.getByLabelText(mockLabelAsString, { selector: '.pf-v6-c-label' });
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    expect(label.classList.contains('pf-m-blue')).toBe(true);
  });

  it('should display grey when the label is currently not selected', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={mockLabel} isSelected={false} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });

    const label = screen.getByLabelText(mockLabelAsString, { selector: '.pf-v6-c-label' });
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    expect(label.classList.contains('pf-m-blue')).toBe(false);
  });

  it('should update label filters when clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={mockLabel} isSelected={true} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });

    const label = screen.getByText(mockLabelAsString);
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    await user.click(label);

    expect(onLabelClick).toHaveBeenCalledTimes(1);
    expect(onLabelClick).toHaveBeenCalledWith(mockLabel);
  });

  it('should format startTime label as a human-readable datetime', async () => {
    const startTimeMillis = 1782483737600;
    const startTimeLabel: KeyValue = { key: 'startTime', value: String(startTimeMillis) };
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={startTimeLabel} isSelected={false} onLabelClick={onLabelClick} />,
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
            element: <ClickableLabel label={durationLabel} isSelected={false} onLabelClick={onLabelClick} />,
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
            element: <ClickableLabel label={badLabel} isSelected={false} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });

    const displayedLabel = screen.getByText('startTime=not-a-timestamp');
    expect(displayedLabel).toBeInTheDocument();
    expect(displayedLabel).toBeVisible();
  });
});
