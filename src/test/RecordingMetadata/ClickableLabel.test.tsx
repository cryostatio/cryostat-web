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
import { RecordingLabel } from '@app/RecordingMetadata/types';
import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { render, renderSnapshot } from '../utils';

const mockLabel = {
  key: 'someLabel',
  value: 'someValue',
} as RecordingLabel;
const mockLabelAsString = 'someLabel: someValue';

const onLabelClick = jest.fn((_label: RecordingLabel) => {
  /**Do nothing. Used for checking renders */
});

const blueLabelBorderColor = '#06c';
const greyLabelBorderColor = '#8a8d90';

describe('<ClickableLabel />', () => {
  afterEach(cleanup);

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={mockLabel} isSelected={true} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });
    expect(tree?.toJSON()).toMatchSnapshot();
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

    const label = screen.getByLabelText(mockLabelAsString);
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

    const label = screen.getByLabelText(mockLabelAsString);
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    expect(label.classList.contains('pf-m-blue')).toBe(false);
  });

  it('should display hover effect when hovered and is selected', async () => {
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

    const label = screen.getByLabelText(mockLabelAsString);
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    expect(label.classList.contains('pf-m-blue')).toBe(true);

    await user.hover(label);

    const labelStyle = label.style;
    expect(labelStyle.cursor).toBe('pointer');
    expect(labelStyle.getPropertyValue('--pf-c-label__content--before--BorderWidth')).toBe('2.5px');
    expect(labelStyle.getPropertyValue('--pf-c-label__content--before--BorderColor')).toBe(blueLabelBorderColor);
  });

  it('should display hover effect when hovered and is not selected', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ClickableLabel label={mockLabel} isSelected={false} onLabelClick={onLabelClick} />,
          },
        ],
      },
    });

    const label = screen.getByLabelText(mockLabelAsString);
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    expect(label.classList.contains('pf-m-blue')).toBe(false);

    await user.hover(label);

    const labelStyle = label.style;
    expect(labelStyle.cursor).toBe('pointer');
    expect(labelStyle.getPropertyValue('--pf-c-label__content--before--BorderWidth')).toBe('2.5px');
    expect(labelStyle.getPropertyValue('--pf-c-label__content--before--BorderColor')).toBe(greyLabelBorderColor);
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

    const label = screen.getByLabelText(mockLabelAsString);
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    expect(label.classList.contains('pf-m-blue')).toBe(true);

    await user.click(label);

    expect(onLabelClick).toHaveBeenCalledTimes(1);
    expect(onLabelClick).toHaveBeenCalledWith(mockLabel);
  });
});
