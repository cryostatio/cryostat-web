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
import { RecordingLabelFields, RecordingLabelFieldsProps } from '@app/RecordingMetadata/RecordingLabelFields';
import { KeyValue } from '@app/Shared/Services/api.types';
import { ValidatedOptions } from '@patternfly/react-core';
import '@testing-library/jest-dom';
import * as tlr from '@testing-library/react';
import { cleanup, screen } from '@testing-library/react';
import { render, renderSnapshot } from '../utils';

const mockUploadedRecordingLabels = {
  someUploaded: 'someUploadedValue',
};
const mockMetadataFileName = 'mock.metadata.json';
const mockMetadataFile = new File(
  [JSON.stringify({ labels: { ...mockUploadedRecordingLabels } })],
  mockMetadataFileName,
  { type: 'json' },
);
mockMetadataFile.text = jest.fn(
  () => new Promise((resolve, _) => resolve(JSON.stringify({ labels: { ...mockUploadedRecordingLabels } }))),
);

describe('<RecordingLabelFields />', () => {
  // RecordingLabelFields component modifies labels in-place, so we need to reinitialize mocks
  // after every tests.
  let mockLabels: KeyValue[];
  let mockValid: ValidatedOptions;
  let mockProps: RecordingLabelFieldsProps;
  let mockLabel1: KeyValue;
  let mockLabel2: KeyValue;
  let mockEmptyLabel: KeyValue;

  afterEach(cleanup);

  beforeEach(() => {
    mockLabel1 = {
      key: 'someLabel',
      value: 'someValue',
    } as KeyValue;
    mockLabel2 = {
      key: 'anotherLabel',
      value: 'anotherValue',
    } as KeyValue;
    mockEmptyLabel = {
      key: '',
      value: '',
    } as KeyValue;
    mockLabels = [mockLabel1, mockLabel2];
    mockValid = ValidatedOptions.default;
    mockProps = {
      labels: mockLabels,
      setLabels: jest.fn((labels: KeyValue[]) => (mockLabels = labels.slice())),
      setValid: jest.fn((state: ValidatedOptions) => (mockValid = state)),
    };
  });

  it('renders correctly', async () => {
    const tree = await renderSnapshot({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });
    expect(tree).toMatchSnapshot();
  });

  it('displays all Labels in form fields', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    const inputs = [
      screen.getByDisplayValue('someLabel'),
      screen.getByDisplayValue('someValue'),
      screen.getByDisplayValue('anotherLabel'),
      screen.getByDisplayValue('anotherValue'),
    ];

    inputs.forEach((input) => {
      expect(input).toBeInTheDocument();
      expect(input).toBeVisible();
    });

    const addLabelButton = screen.getByRole('button', { name: 'Add Label' });
    expect(addLabelButton).toBeInTheDocument();
    expect(addLabelButton).toBeVisible();

    expect(mockProps.setValid).toHaveBeenCalledTimes(1);
    expect(mockProps.setValid).toHaveBeenCalledWith(ValidatedOptions.success);
  });

  it('updates the label key when entering text into the Key input', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    const labelKeyInput = screen.getAllByLabelText('Label Key')[0] as HTMLInputElement;
    expect(labelKeyInput).toBeInTheDocument();
    expect(labelKeyInput).toBeVisible();

    labelKeyInput.setSelectionRange(0, mockProps.labels[0].key.length);
    labelKeyInput.focus();
    await user.paste('someEditedKey');

    expect(mockProps.labels[0].key).toBe('someEditedKey');
  });

  it('updates the label value when entering text into the Value input', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    const labelValueInput = screen.getAllByLabelText('Label Value')[0] as HTMLInputElement;
    expect(labelValueInput).toBeInTheDocument();
    expect(labelValueInput).toBeVisible();

    labelValueInput.setSelectionRange(0, mockProps.labels[0].value.length);
    labelValueInput.focus();
    await user.paste('someEditedValue');

    expect(mockProps.labels[0].value).toBe('someEditedValue');
  });

  it('validates Labels on initial render', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    expect(mockProps.setValid).toHaveBeenCalledTimes(1);
    expect(mockProps.setValid).toHaveBeenCalledWith(ValidatedOptions.success);
    expect(mockValid).toBe(ValidatedOptions.success);
  });

  it('adds a label when Add Label is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    expect(screen.getAllByLabelText('Label Key').length).toBe(2);
    expect(screen.getAllByLabelText('Label Value').length).toBe(2);

    await user.click(screen.getByText('Add Label'));

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([mockLabel1, mockLabel2, mockEmptyLabel]);
  });

  it('removes the correct label when Delete button is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    expect(screen.getAllByLabelText('Label Key').length).toBe(2);
    expect(screen.getAllByLabelText('Label Value').length).toBe(2);

    await user.click(screen.getAllByLabelText('Remove Label')[0]);

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([mockLabel2]);
  });

  it('validates the label key when valid', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.success);

    screen.getAllByLabelText('Label Key').forEach((element) => {
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
      expect(element.classList.contains('pf-m-success')).toBe(true);
    });
  });

  it('validates the label value when valid', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.success);

    screen.getAllByLabelText('Label Value').forEach((element) => {
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
      expect(element.classList.contains('pf-m-success')).toBe(true);
    });
  });

  it('invalidates form when the label key is invalid', async () => {
    const invalidLabels = [{ key: 'label with whitespace', value: 'someValue' }];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} labels={invalidLabels} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.error);
  });

  it('invalidates form when the label value is invalid', async () => {
    const invalidLabels = [{ key: 'someLabel', value: 'value with whitespace' }];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} labels={invalidLabels} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.error);
  });

  it('shows error text when the label key is invalid', async () => {
    const invalidLabels = [{ key: 'label with whitespace', value: 'someValue' }];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} labels={invalidLabels} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.error);

    const errorText = await screen.findByText('Keys must be unique. Labels should not contain empty spaces.');
    expect(errorText).toBeInTheDocument();
    expect(errorText).toBeVisible();
  });

  it('shows error text when the label value is invalid', async () => {
    const invalidLabels = [{ key: 'someLabel', value: 'value with whitespace' }];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} labels={invalidLabels} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.error);

    const errorText = await screen.findByText('Keys must be unique. Labels should not contain empty spaces.');
    expect(errorText).toBeInTheDocument();
    expect(errorText).toBeVisible();
  });

  it('shows upload button when upload is enabled ', async () => {
    mockProps.isUploadable = true;

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    const uploadButton = screen.getByRole('button', { name: 'Upload Labels' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();
  });

  it('updates label list when upload is enabled and upload is submitted', async () => {
    mockProps.isUploadable = true;

    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} />,
          },
        ],
      },
    });

    const uploadButton = screen.getByRole('button', { name: 'Upload Labels' });
    expect(uploadButton).toBeInTheDocument();
    expect(uploadButton).toBeVisible();

    await user.click(uploadButton);

    const labelUploadInput = document.querySelector("input[accept='.json'][type='file']") as HTMLInputElement;
    expect(labelUploadInput).toBeInTheDocument();

    await tlr.act(async () => {
      await user.upload(labelUploadInput, mockMetadataFile);
    });

    expect(labelUploadInput.files).not.toBe(null);
    expect(labelUploadInput.files?.item(0)).toStrictEqual(mockMetadataFile);

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([
      mockLabel1,
      mockLabel2,
      { key: 'someUploaded', value: 'someUploadedValue' },
    ]);
  });
});
