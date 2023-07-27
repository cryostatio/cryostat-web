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
import { LoadingView } from '@app/LoadingView/LoadingView';
import { parseLabelsFromFile, RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  List,
  ListItem,
  Popover,
  Split,
  SplitItem,
  Text,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { CloseIcon, ExclamationCircleIcon, FileIcon, PlusCircleIcon, UploadIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { catchError, Observable, of, zip } from 'rxjs';

export interface RecordingLabelFieldsProps {
  labels: RecordingLabel[];
  setLabels: (labels: RecordingLabel[]) => void;
  setValid: (isValid: ValidatedOptions) => void;
  isUploadable?: boolean;
  isDisabled?: boolean;
}

export const LabelPattern = /^\S+$/;

const getValidatedOption = (isValid: boolean) => {
  return isValid ? ValidatedOptions.success : ValidatedOptions.error;
};

const matchesLabelSyntax = (l: RecordingLabel) => {
  return l && LabelPattern.test(l.key) && LabelPattern.test(l.value);
};

export const RecordingLabelFields: React.FC<RecordingLabelFieldsProps> = ({ setLabels, setValid, ...props }) => {
  const inputRef = React.useRef<HTMLInputElement>(null); // Use ref to refer to child component
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const [loading, setLoading] = React.useState(false);
  const [invalidUploads, setInvalidUploads] = React.useState<string[]>([]);

  const handleKeyChange = React.useCallback(
    (idx, key) => {
      const updatedLabels = [...props.labels];
      updatedLabels[idx].key = key;
      setLabels(updatedLabels);
    },
    [props.labels, setLabels]
  );

  const handleValueChange = React.useCallback(
    (idx, value) => {
      const updatedLabels = [...props.labels];
      updatedLabels[idx].value = value;
      setLabels(updatedLabels);
    },
    [props.labels, setLabels]
  );

  const handleAddLabelButtonClick = React.useCallback(() => {
    setLabels([...props.labels, { key: '', value: '' } as RecordingLabel]);
  }, [props.labels, setLabels]);

  const handleDeleteLabelButtonClick = React.useCallback(
    (idx) => {
      const updated = [...props.labels];
      updated.splice(idx, 1);
      setLabels(updated);
    },
    [props.labels, setLabels]
  );

  const isLabelValid = React.useCallback(matchesLabelSyntax, [matchesLabelSyntax]);

  const isDuplicateKey = React.useCallback((key: string, labels: RecordingLabel[]) => {
    return labels.filter((label) => label.key === key).length > 1;
  }, []);

  const allLabelsValid = React.useMemo(() => {
    if (!props.labels.length) {
      return true;
    }
    return props.labels.reduce(
      (prev, curr) => isLabelValid(curr) && !isDuplicateKey(curr.key, props.labels) && prev,
      true
    );
  }, [props.labels, isLabelValid, isDuplicateKey]);

  const validKeys = React.useMemo(() => {
    const arr = Array(props.labels.length).fill(ValidatedOptions.default);
    props.labels.forEach((label, index) => {
      if (label.key.length > 0) {
        arr[index] = getValidatedOption(LabelPattern.test(label.key) && !isDuplicateKey(label.key, props.labels));
      } // Ignore initial empty key inputs
    });
    return arr;
  }, [props.labels, isDuplicateKey]);

  const validValues = React.useMemo(() => {
    const arr = Array(props.labels.length).fill(ValidatedOptions.default);
    props.labels.forEach((label, index) => {
      if (label.value.length > 0) {
        arr[index] = getValidatedOption(LabelPattern.test(label.value));
      } // Ignore initial empty value inputs
    });
    return arr;
  }, [props.labels]);

  React.useEffect(() => {
    setValid(getValidatedOption(allLabelsValid));
  }, [setValid, allLabelsValid]);

  const handleUploadLabel = React.useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files.length) {
        const tasks: Observable<RecordingLabel[]>[] = [];
        setLoading(true);
        for (const labelFile of e.target.files) {
          tasks.push(
            parseLabelsFromFile(labelFile).pipe(
              catchError((_) => {
                setInvalidUploads((old) => old.concat([labelFile.name]));
                return of([]);
              })
            )
          );
        }
        addSubscription(
          zip(tasks).subscribe((labelArrays: RecordingLabel[][]) => {
            setLoading(false);
            const labels = labelArrays.reduce((acc, next) => acc.concat(next), []);
            setLabels([...props.labels, ...labels]);
          })
        );
      }
    },
    [setLabels, props.labels, addSubscription, setLoading]
  );

  const closeWarningPopover = React.useCallback(() => setInvalidUploads([]), [setInvalidUploads]);

  const openLabelFileBrowse = React.useCallback(() => {
    inputRef.current && inputRef.current.click();
  }, [inputRef]);

  return loading ? (
    <LoadingView />
  ) : (
    <>
      <Button
        aria-label="Add Label"
        onClick={handleAddLabelButtonClick}
        variant="link"
        icon={<PlusCircleIcon />}
        isDisabled={props.isDisabled}
      >
        Add Label
      </Button>
      {props.isUploadable && (
        <>
          <Popover
            appendTo={portalRoot}
            isVisible={!!invalidUploads.length}
            aria-label="uploading warning"
            alertSeverityVariant="danger"
            headerContent="Invalid Selection"
            headerComponent="h1"
            shouldClose={closeWarningPopover}
            headerIcon={<ExclamationCircleIcon />}
            bodyContent={
              <>
                <Text component="h4">
                  {t('RecordingLabelFields.INVALID_UPLOADS', { count: invalidUploads.length })}
                </Text>
                <List>
                  {invalidUploads.map((uploadName) => (
                    <ListItem key={uploadName} icon={<FileIcon />}>
                      {uploadName}
                    </ListItem>
                  ))}
                </List>
              </>
            }
          >
            <Button
              aria-label="Upload Labels"
              onClick={openLabelFileBrowse}
              variant="link"
              icon={<UploadIcon />}
              isDisabled={props.isDisabled}
            >
              Upload Labels
            </Button>
          </Popover>
          <input
            ref={inputRef}
            accept={'.json'}
            type="file"
            style={{ display: 'none' }}
            onChange={handleUploadLabel}
            multiple
          />
        </>
      )}
      {props.labels.map((label, idx) => (
        <Split hasGutter key={idx}>
          <SplitItem isFilled>
            <TextInput
              isRequired
              type="text"
              id="label-key-input"
              name="label-key-input"
              aria-describedby="label-key-input-helper"
              aria-label="Label Key"
              value={label.key ?? ''}
              onChange={(key) => handleKeyChange(idx, key)}
              validated={validKeys[idx]}
              isDisabled={props.isDisabled}
            />
            <Text>Key</Text>
            <FormHelperText
              isHidden={validKeys[idx] !== ValidatedOptions.error && validValues[idx] !== ValidatedOptions.error}
              component="div"
            >
              <HelperText id="label-error-text">
                <HelperTextItem variant="error">
                  Keys must be unique. Labels should not contain empty spaces.
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
              aria-label="Label Value"
              value={label.value ?? ''}
              onChange={(value) => handleValueChange(idx, value)}
              validated={validValues[idx]}
              isDisabled={props.isDisabled}
            />
            <Text>Value</Text>
          </SplitItem>
          <SplitItem>
            <Button
              onClick={() => handleDeleteLabelButtonClick(idx)}
              variant="link"
              aria-label="Remove Label"
              isDisabled={props.isDisabled}
              icon={<CloseIcon color="gray" size="sm" />}
            />
          </SplitItem>
        </Split>
      ))}
    </>
  );
};
