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

export interface EditRecordingLabelsProps {
  labels: RecordingLabel[];
  setLabels: (labels: RecordingLabel[]) => void;
  valid: ValidatedOptions;
  setValid: (isValid: ValidatedOptions) => void;
}

export const LabelPattern = /^\S+$/;

export const EditRecordingLabels: React.FunctionComponent<EditRecordingLabelsProps> = (props) => {
  const [validKeys, setValidKeys] = React.useState(Array(props.labels.length).fill(ValidatedOptions.default));
  const [validValues, setValidVals] = React.useState(Array(props.labels.length).fill(ValidatedOptions.default));
  const [uniqueKeys, setUniqueKeys] = React.useState(Array.from(props.labels, (v) => v.key));

  const handleKeyChange = React.useCallback(
    (idx, key) => {
      let updatedLabels = [...props.labels];
      updatedLabels[idx].key = key;
      let updatedKeys = [...uniqueKeys];
      updatedKeys[idx] = key;
      setUniqueKeys(updatedKeys);
      props.setLabels(updatedLabels);
      props.setLabels(updatedLabels);
    },
    [props.labels, props.setLabels, uniqueKeys, setUniqueKeys]
  );

  const handleValueChange = React.useCallback(
    (idx, value) => {
      let updatedLabels = [...props.labels];
      updatedLabels[idx].value = value;
      props.setLabels(updatedLabels);
    },
    [props.labels, props.setLabels]
  );

  const handleAddLabelButtonClick = React.useCallback(() => {
    props.setLabels([...props.labels, { key: '', value: '' } as RecordingLabel]);
  }, [props.labels, props.setLabels]);

  const handleDeleteLabelButtonClick = React.useCallback(
    (idx) => {
      let updatedLabels = [...props.labels];
      updatedLabels.splice(idx, 1);
      props.setLabels(updatedLabels);
    },
    [props.labels, props.setLabels]
  );

  const validateKey = React.useCallback(
    (idx, key) => {
      let updatedValidKeys = [...validKeys];
      const hasValidSyntax = LabelPattern.test(key);
      const isUniqueKey = uniqueKeys.indexOf(key) == uniqueKeys.lastIndexOf(key);
      const isValid = hasValidSyntax && isUniqueKey;

      const pairedValueIsEmpty = !props.labels[idx].value;
      if (pairedValueIsEmpty) {
        let updatedValidValues = [...validValues];
        setValidVals(updatedValidValues);
      }

      updatedValidKeys[idx] = isValid ? ValidatedOptions.success : ValidatedOptions.error;
      setValidKeys(updatedValidKeys);
    },
    [props.labels, setValidKeys, setValidVals]
  );

  const validateValue = React.useCallback(
    (idx, value) => {
      let updatedValidValues = [...validValues];
      const hasValidSyntax = LabelPattern.test(value);

      const pairedKeyIsEmpty = !props.labels[idx].key;
      if (pairedKeyIsEmpty) {
        let updatedValidKeys = [...validKeys];
        updatedValidKeys[idx] = ValidatedOptions.warning;
        setValidKeys(updatedValidKeys);
      }

      updatedValidValues[idx] = hasValidSyntax ? ValidatedOptions.success : ValidatedOptions.error;
      setValidVals(updatedValidValues);
    },
    [props.labels, setValidVals, setValidKeys]
  );

  const isAllLabelsValid = React.useCallback(() => {
    const initialKeyValid = !!props.labels[0] && !!props.labels[0].key;
    const initialValueValid = !!props.labels[0] && !!props.labels[0].value;

    const allKeysValid = validKeys.reduce(
      (prev, curr) => ((curr != ValidatedOptions.success) && (curr != ValidatedOptions.default) ? false : prev),
      initialKeyValid
    );
    const allValuesValid = validValues.reduce(
      (prev, curr) => ((curr != ValidatedOptions.success) && (curr != ValidatedOptions.default) ? false : prev),
      initialValueValid
    );

    return allKeysValid && allValuesValid;
  }, [validKeys, validValues]);

  React.useEffect(() => {
    props.setValid(isAllLabelsValid() ? ValidatedOptions.success : ValidatedOptions.error);
  }, [validKeys, validValues]);

  return (
    <>
      <Button onClick={handleAddLabelButtonClick} variant="link" icon={<PlusCircleIcon />}>
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
              value={label.key ?? ''}
              onChange={(e) => handleKeyChange(idx, e)}
              onBlur={(e) => validateKey(idx, e.target.value)}
              validated={validKeys[idx]}
            />
            <Text>Key</Text>
            <FormHelperText isHidden={!((validKeys[idx] == ValidatedOptions.error) || (validValues[idx] == ValidatedOptions.error))} component="div">
              <HelperText id="helper-text1">
                <HelperTextItem variant={'error'}>Enter a key-value pair. Keys must be unique. Labels should not contain whitespace.</HelperTextItem>
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
              onChange={(e) => handleValueChange(idx, e)}
              onBlur={(e) => validateValue(idx, e.target.value)}
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
    </>
  );
};
