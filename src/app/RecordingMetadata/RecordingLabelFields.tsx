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
import { CloseIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  Text,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';

export interface RecordingLabelFieldsProps {
  labels: RecordingLabel[];
  setLabels: (labels: RecordingLabel[]) => void;
  valid: ValidatedOptions;
  setValid: (isValid: ValidatedOptions) => void;
}

export const LabelPattern = /^\S+$/;

export const RecordingLabelFields: React.FunctionComponent<RecordingLabelFieldsProps> = (props) => {
  const [validKeys, setValidKeys] = React.useState(Array(!!props.labels ? props.labels.length : 0).fill(ValidatedOptions.default));
  const [validValues, setValidVals] = React.useState(Array(!!props.labels ? props.labels.length : 0).fill(ValidatedOptions.default));

  const handleKeyChange = React.useCallback(
    (idx, key) => {
      let updatedLabels = [...props.labels];
      updatedLabels[idx].key = key;
      props.setLabels(updatedLabels);
      
      updateValidState(idx, getValidatedOption(LabelPattern.test(key)), validKeys, setValidKeys)
    },
    [props.labels, props.setLabels, validKeys, setValidKeys]
  );

  const handleValueChange = React.useCallback(
    (idx, value) => {
      let updatedLabels = [...props.labels];
      updatedLabels[idx].value = value;
      props.setLabels(updatedLabels);
      
      updateValidState(idx, getValidatedOption(LabelPattern.test(value)), validValues, setValidVals)
    },
    [props.labels, props.setLabels, validValues, setValidVals]
  );

  const handleAddLabelButtonClick = React.useCallback(() => {
    props.setLabels([...props.labels, { key: '', value: '' } as RecordingLabel]);
    props.setValid(ValidatedOptions.default);
    setValidKeys([...validKeys, ValidatedOptions.default]);
    setValidVals([...validValues, ValidatedOptions.default]);
  }, [props.labels, validKeys, validValues, props.setLabels, props.setValid, setValidKeys, setValidVals]);

  const handleDeleteLabelButtonClick = React.useCallback(
    (idx) => {
      removeAtIndex(idx, props.labels, props.setLabels);
      removeAtIndex(idx, validKeys, setValidKeys);
      removeAtIndex(idx, validValues, setValidVals);
    },
    [props.labels, validKeys, validValues, props.setLabels, setValidKeys, setValidVals]
  );

  const removeAtIndex = (idx, arr, setArr) => {
    let updated = [...arr];
    updated.splice(idx, 1);
    setArr(updated);
  };

  const validateKeyUniqueness = React.useCallback(
    (idx, key) => {
      const isUniqueKey = validKeys.indexOf(key) === validKeys.lastIndexOf(key);
      const isValid = isUniqueKey && validKeys[idx] != ValidatedOptions.error;
      updateValidState(idx, getValidatedOption(isValid), validKeys, setValidKeys)

      const pairedValueIsEmpty = !props.labels[idx].value;
      if (pairedValueIsEmpty) {
        updateValidState(idx, ValidatedOptions.warning, validValues, setValidVals);
      }
    },
    [props.labels, setValidKeys, setValidVals]
  );

  const validateKeyPairExists = React.useCallback(
    (idx) => {
      const pairedKeyIsEmpty = !props.labels[idx].key;
      if (pairedKeyIsEmpty) {
        updateValidState(idx, ValidatedOptions.warning, validKeys, setValidKeys)
      }
    },
    [props.labels, validKeys, setValidKeys]
  );

  const updateValidState = (idx, newVal, arr, setArr) => {
    let updated = [...arr];
    updated[idx] = newVal;
    setArr(updated);
  };

  const isLabelInvalid = React.useCallback(
    (validationState: ValidatedOptions, idx: number) => {
      switch (validationState) {
        case ValidatedOptions.success:
          return false;
        case ValidatedOptions.default:
          if (matchesLabelSyntax(props.labels[idx])) {
            return false;
          }
        default:
          return true;
      }
    },
    [props.labels]
  );

  const isAllLabelsValid = React.useCallback(() => {
    if (!props.labels.length) {
      return true;
    }
    const firstLabelValid = matchesLabelSyntax(props.labels[0]);

    return validKeys.reduce(
      (prev, curr, idx) => (isLabelInvalid(curr, idx) ? false : prev),
      firstLabelValid
    );
  }, [props.labels, validKeys, validValues, isLabelInvalid]);

  const matchesLabelSyntax = React.useCallback((label: RecordingLabel) => {
    return !!label && LabelPattern.test(label.key) && LabelPattern.test(label.value);
  }, [LabelPattern]);

  const getValidatedOption = (isValid: boolean) => {
    return isValid ? ValidatedOptions.success : ValidatedOptions.error;
  }

  React.useEffect(() => {
    props.setValid(getValidatedOption(isAllLabelsValid()));
  }, [validKeys, validValues]);

  return (
    <>
      <Button onClick={handleAddLabelButtonClick} variant="link" icon={<PlusCircleIcon />}>
        Add Label
      </Button>
      {!!props.labels && props.labels.map((label, idx) => (
        <Split hasGutter key={idx}>
          <SplitItem isFilled>
            <TextInput
              isRequired
              type="text"
              id="label-key-input"
              name="label-key-input"
              aria-describedby="label-key-input-helper"
              aria-label="label key"
              value={label.key ?? ''}
              onChange={(key) => handleKeyChange(idx, key)}
              onBlur={(e) => validateKeyUniqueness(idx, e.target.value)}
              validated={validKeys[idx]}
            />
            <Text>Key</Text>
            <FormHelperText
              isHidden={!(validKeys[idx] == ValidatedOptions.error || validValues[idx] == ValidatedOptions.error)}
              component="div"
            >
              <HelperText id="helper-text1">
                <HelperTextItem variant={'error'}>
                  Enter a key-value pair. Keys must be unique. Labels should not contain whitespace.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </SplitItem>
          <SplitItem isFilled>
            <TextInput
              isRequired
              type="text"
              id="label-value-input"
              name="label-value-input"
              aria-describedby="label-value-input-helper"
              aria-label="label value"
              value={label.value ?? ''}
              onChange={(value) => handleValueChange(idx, value)}
              onBlur={() => validateKeyPairExists(idx)}
              validated={validValues[idx]}
            />
            <Text>Value</Text>
          </SplitItem>
          <SplitItem>
            <Button
              onClick={() => handleDeleteLabelButtonClick(idx)}
              variant="link"
              data-testid="remove-label-button"
              aria-label="remove label"
              icon={<CloseIcon color="gray" size="sm" />}
            />
          </SplitItem>
        </Split>
      ))}
    </>
  );
};
