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
  Button,
  ExpandableSection,
  FormGroup,
  Split,
  SplitItem,
  Text,
  TextInput,
  TextVariants,
  ValidatedOptions,
} from '@patternfly/react-core';

export interface RecordingLabel {
  key: string;
  value: string;
}

export const LabelPattern = /^[a-zA-Z0-9.-]+$/;

export const EditRecordingLabels = ({ labels, setLabels }) => {
  const [labelValid, setLabelValid] = React.useState(ValidatedOptions.default);

  // TODO enforce unique key names and non-null key/values
  // Add hover error message tooltip on exclamation mark

  const handleKeyChange = (idx, key) => {
    let updatedLabels = [...labels];
    updatedLabels[idx].key = key;
    setLabelValid(LabelPattern.test(key) ? ValidatedOptions.success : ValidatedOptions.error);
    setLabels(updatedLabels);
  };

  const handleValueChange = (idx, val) => {
    let updatedLabels = [...labels];
    updatedLabels[idx].value = val;
    setLabelValid(LabelPattern.test(val) ? ValidatedOptions.success : ValidatedOptions.error);
    setLabels(updatedLabels);
  };

  const handleAddLabelButtonClick = () => {
    setLabels([...labels, { key: '', value: '' } as RecordingLabel]);
  };

  const handleDeleteLabelButtonClick = (idx) => {
    let updatedLabels = [...labels];
    updatedLabels.splice(idx, 1);
    setLabels(updatedLabels);
  };

  return (
    <ExpandableSection toggleTextExpanded="Hide metadata options" toggleTextCollapsed="Show metadata options">
      <FormGroup
        label="Labels"
        fieldId="labels"
        helperText="Alphanumeric key/value pairs ('.' and '-' accepted). Keys should be unique."
      >
        <Button onClick={handleAddLabelButtonClick} variant="primary">
          Add Label
        </Button>
      </FormGroup>
      {labels.map((label, idx) => (
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <FormGroup fieldId="label-key" helperText="Key">
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
            </FormGroup>
          </SplitItem>
          <SplitItem isFilled>
            <FormGroup fieldId="label-key" helperText="Value">
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
            </FormGroup>
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
    </ExpandableSection>
  );
};
