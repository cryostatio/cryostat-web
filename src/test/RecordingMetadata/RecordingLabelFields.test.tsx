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
import { KeyValue, keyValueToString } from '@app/Shared/Services/api.types';
import { ValidatedOptions } from '@patternfly/react-core';
import '@testing-library/jest-dom';
import { cleanup, screen, act, within } from '@testing-library/react';
import { render, renderSnapshot } from '../utils';

const mockUploadedRecordingLabels: KeyValue = {
  key: 'someUploaded',
  value: 'someUploadedValue',
};
const mockMetadataFileName = 'mock.metadata.json';
const mockMetadataFile = new File(
  [JSON.stringify({ labels: [{ ...mockUploadedRecordingLabels }] })],
  mockMetadataFileName,
  { type: 'json' },
);
mockMetadataFile.text = jest.fn(
  () => new Promise((resolve, _) => resolve(JSON.stringify({ labels: [{ ...mockUploadedRecordingLabels }] }))),
);

describe('<RecordingLabelFields />', () => {
  // RecordingLabelFields component modifies labels in-place, so we need to reinitialize mocks
  // after every tests.
  let mockLabels: KeyValue[];
  let mockValid: ValidatedOptions;
  let mockProps: RecordingLabelFieldsProps;
  let mockLabel1: KeyValue;
  let mockLabel2: KeyValue;
  let placeHolderLabel: KeyValue;

  afterEach(cleanup);

  beforeEach(() => {
    mockLabel1 = {
      key: 'someLabel',
      value: 'someValue',
    };
    mockLabel2 = {
      key: 'anotherLabel',
      value: 'anotherValue',
    };
    placeHolderLabel = {
      key: 'key',
      value: 'value',
    };
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

  it('should display all available labels', async () => {
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

    mockLabels.map(keyValueToString).forEach((label) => {
      const element = screen.getByText(label);
      expect(element).toBeInTheDocument();
      expect(element).toBeVisible();
    });

    expect(mockProps.setValid).toHaveBeenCalledTimes(1);
    expect(mockProps.setValid).toHaveBeenCalledWith(ValidatedOptions.success);
  });

  it('should validate labels on initial rendering', async () => {
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

  it('should add a placeholder label when Add label is clicked', async () => {
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

    const addBtn = screen.getByText('Add label');
    expect(addBtn).toBeInTheDocument();
    expect(addBtn).toBeVisible();

    await user.click(addBtn);

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([mockLabel1, mockLabel2, placeHolderLabel]);
  });

  it('should update the label list when entering a valid label text', async () => {
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

    const labelWrapper = screen.getByLabelText(keyValueToString(mockLabel1));
    expect(labelWrapper).toBeInTheDocument();
    expect(labelWrapper).toBeVisible();

    const label = within(labelWrapper).getByText(keyValueToString(mockLabel1));
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    await act(async () => {
      await user.click(label);
    });

    const input = labelWrapper.querySelector("input[type='text']") as HTMLInputElement;
    expect(input).toBeInTheDocument();

    await act(async () => {
      await user.clear(input);
      await user.type(input, 'valid-key=valid-value');
      await user.keyboard('{enter}');
    });

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([{ key: 'valid-key', value: 'valid-value' }, mockLabel2]);
  });

  it('should remove the label when entering an invalid label text', async () => {
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

    const labelWrapper = screen.getByLabelText(keyValueToString(mockLabel1));
    expect(labelWrapper).toBeInTheDocument();
    expect(labelWrapper).toBeVisible();

    const label = within(labelWrapper).getByText(keyValueToString(mockLabel1));
    expect(label).toBeInTheDocument();
    expect(label).toBeVisible();

    await act(async () => {
      await user.click(label);
    });

    const input = labelWrapper.querySelector("input[type='text']") as HTMLInputElement;
    expect(input).toBeInTheDocument();

    await act(async () => {
      await user.clear(input);
      await user.type(input, 'this-label-isnotRight');
      await user.keyboard('{enter}');
    });

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([mockLabel2]);
  });

  it('should delete the label when close icon is clicked', async () => {
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

    const labelWrapper = screen.getByLabelText(keyValueToString(mockLabel1));
    expect(labelWrapper).toBeInTheDocument();
    expect(labelWrapper).toBeVisible();

    const closeBtn = within(labelWrapper).getByLabelText(`Close ${keyValueToString(mockLabel1)}`);
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toBeVisible();

    await user.click(closeBtn);

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([mockLabel2]);
  });

  it('shows error text when there are duplicate labels', async () => {
    const labelList = [...mockLabels, ...mockLabels];

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <RecordingLabelFields {...mockProps} labels={labelList} />,
          },
        ],
      },
    });

    expect(mockValid).toBe(ValidatedOptions.error);

    const errorText = await screen.findByText('Keys must be unique. Labels should not contain empty spaces.');
    expect(errorText).toBeInTheDocument();
    expect(errorText).toBeVisible();
  });

  it('should upload button if enabled', async () => {
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

  it('updates label list when upload is enabled and a file is uploaded successfully', async () => {
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

    await act(async () => {
      await user.upload(labelUploadInput, mockMetadataFile);
    });

    expect(labelUploadInput.files).not.toBe(null);
    expect(labelUploadInput.files?.item(0)).toStrictEqual(mockMetadataFile);

    expect(mockProps.setLabels).toHaveBeenCalledTimes(1);
    expect(mockProps.setLabels).toHaveBeenCalledWith([mockLabel1, mockLabel2, mockUploadedRecordingLabels]);
  });
});
