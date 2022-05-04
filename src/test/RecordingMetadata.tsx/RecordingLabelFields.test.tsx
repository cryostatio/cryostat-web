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
import userEvent from '@testing-library/user-event';
import renderer, { act } from 'react-test-renderer';
import { render, screen, waitFor } from '@testing-library/react';
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';

import '@testing-library/jest-dom';

import { RecordingLabelFields } from '@app/RecordingMetadata/RecordingLabelFields';
import { ValidatedOptions } from '@patternfly/react-core';

const mockLabel1 = {
  key: 'someLabel',
  value: 'someValue',
} as RecordingLabel;

const mockLabel2 = {
  key: 'anotherLabel',
  value: 'anotherValue',
} as RecordingLabel;

let mockLabels = [mockLabel1, mockLabel2];
let mockValid = ValidatedOptions.default;

describe('<RecordingLabelFields />', () => {
  beforeEach(() => {
    mockLabels = [mockLabel1, mockLabel2];
    mockValid = ValidatedOptions.default;
  });

  let mockProps = {
    labels: mockLabels,
    setLabels: (l: RecordingLabel[]) => {
      mockLabels = l.slice();
    },
    valid: mockValid,
    setValid: (state: ValidatedOptions) => {
      mockValid = state;
    },
  };

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<RecordingLabelFields {...mockProps} />);
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('displays all labels in form fields', () => {
    render(<RecordingLabelFields {...mockProps} />);

    const label1KeyInput = screen.getAllByDisplayValue('someLabel')[0];
    const label1ValueInput = screen.getAllByDisplayValue('someValue')[0];
    const label2KeyInput = screen.getAllByDisplayValue('anotherLabel')[0];
    const label2ValueInput = screen.getAllByDisplayValue('anotherValue')[0];

    expect(label1KeyInput).toHaveClass('pf-c-form-control');
    expect(label1ValueInput).toHaveClass('pf-c-form-control');
    expect(label2KeyInput).toHaveClass('pf-c-form-control');
    expect(label2ValueInput).toHaveClass('pf-c-form-control');

    expect(screen.getByText('Add Label')).toBeInTheDocument();
  });

  it('updates the label key when entering text into the Key input', () => {
    render(<RecordingLabelFields {...mockProps} />);

    const labelKeyInput = screen.getAllByLabelText('label key')[0];
    userEvent.clear(labelKeyInput);

    userEvent.type(labelKeyInput, 'someEditedKey');
    expect(mockProps.labels[0].key).toBe('someEditedKey');
  });

  it('updates the label value when entering text into the Value input', () => {
    render(<RecordingLabelFields {...mockProps} />);

    const labelValueInput = screen.getAllByLabelText('label value')[0];

    userEvent.clear(labelValueInput);

    userEvent.type(labelValueInput, 'someEditedValue');

    expect(mockProps.labels[0].value).toBe('someEditedValue');
  });

  it('adds a label when Add Label is clicked', () => {
    render(<RecordingLabelFields {...mockProps} />);

    expect(screen.getAllByLabelText('label key').length).toBe(2);
    expect(screen.getAllByLabelText('label value').length).toBe(2);

    userEvent.click(screen.getByText('Add Label'));

    expect(screen.getAllByLabelText('label key').length).toBe(3);
    expect(screen.getAllByLabelText('label value').length).toBe(3);
  });

  it('removes the correct label when Delete button is clicked', () => {
    render(<RecordingLabelFields {...mockProps} />);

    expect(screen.getAllByLabelText('label key').length).toBe(2);
    expect(screen.getAllByLabelText('label value').length).toBe(2);

    userEvent.click(screen.getAllByTestId('remove-label-button')[0]);

    expect(screen.getAllByLabelText('label key').length).toBe(1);
    expect(screen.getAllByLabelText('label value').length).toBe(1);

    expect(screen.getAllByDisplayValue('someLabel').length).toBe(0);
    expect(screen.getAllByDisplayValue('someValue').length).toBe(0);
    expect(screen.getAllByDisplayValue('anotherLabel')[0]).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('anotherValue')[0]).toBeInTheDocument();
  });

  it('validates labels on initial render', () => {
    render(<RecordingLabelFields {...mockProps} />);

    expect(mockValid).toBe(ValidatedOptions.success);
  });

  it('validates the label key when leaving the input field', () => {
    render(<RecordingLabelFields {...mockProps} />);

    const labelKeyInput = screen.getAllByLabelText('label key')[0];
    userEvent.click(labelKeyInput);

    // click somewhere else to leave the input field and trigger validation
    userEvent.click(screen.getAllByLabelText('label value')[0]);

    expect(mockValid).toBe(ValidatedOptions.success);
  });

  it('validates the label value when leaving the input field', () => {
    render(<RecordingLabelFields {...mockProps} />);

    const labelValueInput = screen.getAllByLabelText('label value')[0];
    userEvent.click(labelValueInput);

    // click somewhere else to leave the input field and trigger validation
    userEvent.click(screen.getAllByLabelText('label key')[0]);

    expect(mockValid).toBe(ValidatedOptions.success);
  });

  it('invalidates form when the label key is invalid', () => {
    const invalidLabels = [{key: 'label with whitespace', value: 'someValue'}];

    render(<RecordingLabelFields {...mockProps} labels={invalidLabels} />);

    expect(mockValid).toBe(ValidatedOptions.error);
  });

  it('invalidates form when the label value is invalid', () => {
    const invalidLabels = [{key: 'someLabel', value: 'value with whitespace'}];

    render(<RecordingLabelFields {...mockProps} labels={invalidLabels} />);

    expect(mockValid).toBe(ValidatedOptions.error);
  });
});
