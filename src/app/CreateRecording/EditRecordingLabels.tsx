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
import { CloseIcon, HelpIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  Button,
  FormGroup,
  Split,
  SplitItem,
  Text,
  TextInput,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';

export interface RecordingLabel {
  key: string;
  value: string;
}

export interface EditRecordingLabelsProps {
  labels: RecordingLabel[];
  setLabels: (labels: RecordingLabel[]) => void;
  usePatchForm?: boolean;
  patchRecordingName?: string;
  onPatchSubmit?: () => void;
  onPatchCancel?: () => void;
}

export const LabelPattern = /^[a-zA-Z0-9.-]+$/;

export const EditRecordingLabels = (props) => {
  const [validKeys, setValidKeys] = React.useState(Array(props.labels.size).fill(ValidatedOptions.default));
  const [validValues, setValidVals] = React.useState(Array(props.labels.size).fill(ValidatedOptions.default));
  const [patchFormValid, setPatchFormValid] = React.useState(ValidatedOptions.default);

  const handleKeyChange = React.useCallback((idx, key) => {
    let updatedLabels = [...props.labels];
    updatedLabels[idx].key = key;
    const valid = validKeys;
    valid[idx] = LabelPattern.test(key) ? ValidatedOptions.success : ValidatedOptions.error;
    setValidKeys(valid);
    props.setLabels(updatedLabels);
  }, [props.labels, props.setLabels]);

  const handleValueChange = React.useCallback((idx, val) => {
    let updatedLabels = [...props.labels];
    updatedLabels[idx].value = val;
    const valid = validValues;
    valid[idx] = LabelPattern.test(val) ? ValidatedOptions.success : ValidatedOptions.error;
    setValidVals(valid);
    props.setLabels(updatedLabels);
  }, [props.labels, props.setLabels]);

  const handleAddLabelButtonClick = React.useCallback(() => {
    props.setLabels([...props.labels, { key: "", value: "" } as RecordingLabel]);
  }, [props.labels, props.setLabels]);

  const handleDeleteLabelButtonClick = React.useCallback((idx) => {
    let updatedLabels = [...props.labels];
    updatedLabels.splice(idx, 1);
    props.setLabels(updatedLabels);
  }, [props.labels, props.setLabels]);

  const validateAllLabels = React.useCallback(() => {
    let updatedValidKeys = validKeys;
    let updatedValidVals = validValues;
    let keys = [] as string[];
    let isValid = true;

    props.labels.map((l, idx) => {
      let hasValidKey = LabelPattern.test(l.key);
      const hasValidValue = LabelPattern.test(l.value);

      if (keys.indexOf(l.key) !== -1) {
        hasValidKey = false;
      } else {
        keys.push(l.key);
      }

      isValid = hasValidKey && hasValidValue;

      updatedValidKeys[idx] = hasValidKey ? ValidatedOptions.success : ValidatedOptions.error;
      updatedValidVals[idx] = hasValidValue ? ValidatedOptions.success : ValidatedOptions.error;
    });

    setValidKeys(updatedValidKeys);
    setValidVals(updatedValidVals);
    setPatchFormValid(isValid ? ValidatedOptions.success : ValidatedOptions.error);

    return isValid;
  }, [props.labels]);

  return (
    <FormGroup
      label="Labels"
      fieldId="labels"
      labelIcon={
        <Tooltip content={<div>Alphanumeric key value pairs. Keys must be unique.'.' and '-' accepted.</div>}>
          <HelpIcon noVerticalAlign />
        </Tooltip>
      }
      helperTextInvalid={"Enter a valid label. Letters, numbers, '.' and '-' accepted. Keys must be unique."}
      validated={patchFormValid}
    >
      <Button onClick={handleAddLabelButtonClick} variant="link" icon={<PlusCircleIcon/>}>
        Add Label
      </Button>
      {props.labels.map((label, idx) => (
        <Split hasGutter key={idx}>
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
              validated={validKeys[idx]}
            />
            <Text>Key</Text>
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
              validated={validValues[idx]}
            />
            <Text>Value</Text>
          </SplitItem>
          <SplitItem>
            <Button
              onClick={() => handleDeleteLabelButtonClick(idx)}
              variant="link"
              aria-label="remove label"
              icon={<CloseIcon color="gray" size="sm" />}
            />
          </SplitItem>
        </Split>
      ))}
      {props.usePatchForm && (
        <Split hasGutter>
          <SplitItem>
            <Button
              variant="primary"
              onClick={() => { 
                if(validateAllLabels()) {
                  props.onPatchSubmit();
                }
              }}
              isDisabled={!patchFormValid}
            >
              Save
            </Button>
          </SplitItem>
          <SplitItem>
            <Button variant="secondary" onClick={() => props.onPatchCancel()}>
              Cancel
            </Button>
          </SplitItem>
        </Split>
      )}
    </FormGroup>
  );
};

export const parseLabels = (jsonLabels) => {
  if(!jsonLabels) return [];

  return Object.entries(jsonLabels).map(([k, v]) => {
    return {key: k, value: v} as RecordingLabel;
  });
};
