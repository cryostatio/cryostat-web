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
  const [keys, setKeys] = React.useState(!!props.labels ? props.labels.map(l => l.key) : []);

  const handleKeyChange = React.useCallback(
    (idx, key) => {
      let updatedLabels = [...props.labels];
      updatedLabels[idx].key = key;
      props.setLabels(updatedLabels);
      
      let updatedKeys = [...keys];
      updatedKeys[idx] = key;
      setKeys(updatedKeys);

      updateValidState(idx, LabelPattern.test(key) && (updatedKeys.indexOf(key) == idx), validKeys, setValidKeys);
    },
    [keys, props.labels, props.setLabels, validKeys, setValidKeys]
  );

  const handleValueChange = React.useCallback(
    (idx, value) => {
      let updatedLabels = [...props.labels];
      updatedLabels[idx].value = value;
      props.setLabels(updatedLabels); 

      updateValidState(idx, LabelPattern.test(value), validValues, setValidVals);
    },
    [props.labels, props.setLabels, validValues, setValidVals]
  );

  const handleAddLabelButtonClick = React.useCallback(() => {
    props.setLabels([...props.labels, { key: '', value: '' } as RecordingLabel]);
    setKeys([...keys, '']);
    props.setValid(ValidatedOptions.default);
    setValidKeys([...validKeys, ValidatedOptions.default]);
    setValidVals([...validValues, ValidatedOptions.default]);
  }, [props.labels, validKeys, validValues, props.setLabels, props.setValid, setValidKeys, setValidVals]);

  const handleDeleteLabelButtonClick = React.useCallback(
    (idx) => {
      removeAtIndex(idx, props.labels, props.setLabels);
      removeAtIndex(idx, keys, setKeys);
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

  const updateValidState = (idx, isValid, arr, setArr) => {
    let updated = [...arr];
    updated[idx] = getValidatedOption(isValid);
    setArr(updated);
  };

  const getValidatedOption = (isValid: boolean) => {
    return isValid ? ValidatedOptions.success: ValidatedOptions.error;
  }

  const matchesLabelSyntax = React.useCallback((l: RecordingLabel) => {
    return !!l && LabelPattern.test(l.key) && LabelPattern.test(l.value);
  }, [LabelPattern]);

  const isLabelInvalid = React.useCallback((validState: ValidatedOptions, idx: number) => {
    switch (validState) {
      case ValidatedOptions.error:
      case ValidatedOptions.warning:
        return true;
      case ValidatedOptions.default:
        if(!props.labels || !matchesLabelSyntax(props.labels[idx])) {
          return true;
        }
      default: return false;
    }
  }, [props.labels]);

  const allLabelsValid = React.useMemo(() => {

    if(!!props.labels && !props.labels.length) {
      return true;
    }

    const firstLabelValid = matchesLabelSyntax(props.labels[0]);

    const allKeysValid = validKeys.reduce(
      (prev, curr, idx) => (isLabelInvalid(curr, idx) ? false : prev),
      firstLabelValid
    );

    const allValuesValid = validValues.reduce(
      (prev, curr, idx) => (isLabelInvalid(curr, idx) ? false : prev),
      firstLabelValid
    );
    return allKeysValid && allValuesValid;
  }, [validKeys, validValues]);

  React.useEffect(() => {
    props.setValid(getValidatedOption(allLabelsValid));
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
              validated={validKeys[idx]}
            />
            <Text>Key</Text>
            <FormHelperText
              isHidden={!(validKeys[idx] == ValidatedOptions.error || validValues[idx] == ValidatedOptions.error)}
              component="div"
            >
              <HelperText id="helper-text1">
                <HelperTextItem variant={'error'}>
                  Keys must be unique. Labels should not contain whitespace.
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
