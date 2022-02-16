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
import { CloseIcon } from '@patternfly/react-icons';
import {
  ActionGroup,
  Button,
  FormGroup,
  Split,
  SplitItem,
  Text,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface RecordingLabel {
  key: string;
  value: string;
}

export interface EditRecordingLabelsProps {
  labels: RecordingLabel[];
  setLabels: (labels: RecordingLabel[]) => void;
  showSaveButton?: boolean;
  savedRecordingName?: string;
  showForm?: (showForm: boolean) => void;
}

export const LabelPattern = /^[a-zA-Z0-9.-]+$/;

export const EditRecordingLabels = (props) => {
  const context = React.useContext(ServiceContext);
  const [labelValid, setLabelValid] = React.useState(ValidatedOptions.default);

  // TODO enforce unique key names and non-null key/values
  // Only highlight the one field causing the error
  // Add hover error message tooltip on exclamation mark

  const handleKeyChange = (idx, key) => {
    let updatedLabels = [...props.labels];
    updatedLabels[idx].key = key;
    setLabelValid(LabelPattern.test(key) ? ValidatedOptions.success : ValidatedOptions.error);
    props.setLabels(updatedLabels);
  };

  const handleValueChange = (idx, val) => {
    let updatedLabels = [...props.labels];
    updatedLabels[idx].value = val;
    setLabelValid(LabelPattern.test(val) ? ValidatedOptions.success : ValidatedOptions.error);
    props.setLabels(updatedLabels);
  };

  const handleAddLabelButtonClick = () => {
    props.setLabels([...props.labels, { key: '', value: '' } as RecordingLabel]);
  };

  const handleDeleteLabelButtonClick = (idx) => {
    let updatedLabels = [...props.labels];
    updatedLabels.splice(idx, 1);
    props.setLabels(updatedLabels);
  };

  const handleSave = () => {
    context.api.patchRecordingLabels(props.recordingName, props.labels);
    props.showForm(false);
  };

  return (
    <>
      <Button onClick={handleAddLabelButtonClick} variant="primary">
        Add Label
      </Button>
      {props.labels.map((label, idx) => (
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              isRequired
              type="text"
              id="label-key-input"
              name="label-key-input"
              aria-describedby="label-key-input-helper"
              aria-label="label key"
              value={label.key}
              onChange={(e) => handleKeyChange(idx, e)}
              validated={labelValid}
            />
          </SplitItem>
          <SplitItem isFilled>
            <TextInput
              isRequired
              type="text"
              id="label-value-input"
              name="label-value-input"
              aria-describedby="label-value-input-helper"
              aria-label="label value"
              value={label.value}
              onChange={(e) => handleValueChange(idx, e)}
              validated={labelValid}
            />
          </SplitItem>
          <SplitItem>
            <Button
              onClick={() => handleDeleteLabelButtonClick(idx)}
              variant="link"
              icon={<CloseIcon color="gray" size="sm" />}
            />
          </SplitItem>
        </Split>
      ))}
      { props.showSaveButton &&
      <ActionGroup>
        <Button variant="primary" onClick={handleSave} isDisabled={labelValid !== ValidatedOptions.success}>Save</Button>
        <Button variant="secondary" onClick={() => props.showForm(false)}>Cancel</Button>
      </ActionGroup>
      }
  </>
  );
};
