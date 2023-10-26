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
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { KeyValue } from '@app/Shared/Services/api.types';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
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
import { matchesLabelSyntax, getValidatedOption, LabelPattern, parseLabelsFromFile } from './utils';

export interface RecordingLabelFieldsProps {
  labels: KeyValue[];
  setLabels: (labels: KeyValue[]) => void;
  setValid: (isValid: ValidatedOptions) => void;
  isUploadable?: boolean;
  isDisabled?: boolean;
}

export const RecordingLabelFields: React.FC<RecordingLabelFieldsProps> = ({
  labels,
  setLabels,
  setValid,
  isUploadable,
  isDisabled,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null); // Use ref to refer to child component
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();

  const [loading, setLoading] = React.useState(false);
  const [invalidUploads, setInvalidUploads] = React.useState<string[]>([]);

  const handleKeyChange = React.useCallback(
    (idx: number, key: string) => {
      const updatedLabels = [...labels];
      updatedLabels[idx].key = key;
      setLabels(updatedLabels);
    },
    [labels, setLabels],
  );

  const handleValueChange = React.useCallback(
    (idx: number, value: string) => {
      const updatedLabels = [...labels];
      updatedLabels[idx].value = value;
      setLabels(updatedLabels);
    },
    [labels, setLabels],
  );

  const handleAddLabelButtonClick = React.useCallback(() => {
    setLabels([...labels, { key: '', value: '' } as KeyValue]);
  }, [labels, setLabels]);

  const handleDeleteLabelButtonClick = React.useCallback(
    (idx: number) => {
      const updated = [...labels];
      updated.splice(idx, 1);
      setLabels(updated);
    },
    [labels, setLabels],
  );

  const isDuplicateKey = React.useCallback(
    (key: string, labels: KeyValue[]) => labels.filter((label) => label.key === key).length > 1,
    [],
  );

  const validKeys = React.useMemo(() => {
    const arr = Array(labels.length).fill(ValidatedOptions.default);
    labels.forEach((label, index) => {
      if (label.key.length > 0) {
        arr[index] = getValidatedOption(LabelPattern.test(label.key) && !isDuplicateKey(label.key, labels));
      } // Ignore initial empty key inputs
    });
    return arr;
  }, [labels, isDuplicateKey]);

  const validValues = React.useMemo(() => {
    const arr = Array(labels.length).fill(ValidatedOptions.default);
    labels.forEach((label, index) => {
      if (label.value.length > 0) {
        arr[index] = getValidatedOption(LabelPattern.test(label.value));
      } // Ignore initial empty value inputs
    });
    return arr;
  }, [labels]);

  React.useEffect(() => {
    const valid = labels.reduce(
      (prev, curr) => matchesLabelSyntax(curr) && !isDuplicateKey(curr.key, labels) && prev,
      true,
    );
    setValid(getValidatedOption(valid));
  }, [setValid, labels, isDuplicateKey]);

  const handleUploadLabel = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length) {
        const tasks: Observable<KeyValue[]>[] = [];
        setLoading(true);
        for (const labelFile of Array.from(files)) {
          tasks.push(
            parseLabelsFromFile(labelFile).pipe(
              catchError((_) => {
                setInvalidUploads((old) => old.concat([labelFile.name]));
                return of([]);
              }),
            ),
          );
        }
        addSubscription(
          zip(tasks).subscribe((labelArrays: KeyValue[][]) => {
            setLoading(false);
            const newLabels = labelArrays.reduce((acc, next) => acc.concat(next), []);
            setLabels([...labels, ...newLabels]);
          }),
        );
      }
    },
    [setLabels, addSubscription, setLoading, labels],
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
        isDisabled={isDisabled}
      >
        Add Label
      </Button>
      {isUploadable && (
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
              isDisabled={isDisabled}
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
      {labels.map((label, idx) => (
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
              onChange={(_event, key) => handleKeyChange(idx, key)}
              validated={validKeys[idx]}
              isDisabled={isDisabled}
            />
            <Text>Key</Text>
            <FormHelperText>
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
              onChange={(_event, value) => handleValueChange(idx, value)}
              validated={validValues[idx]}
              isDisabled={isDisabled}
            />
            <Text>Value</Text>
          </SplitItem>
          <SplitItem>
            <Button
              onClick={() => handleDeleteLabelButtonClick(idx)}
              variant="link"
              aria-label="Remove Label"
              isDisabled={isDisabled}
              icon={
                <Icon size="sm">
                  <CloseIcon color="gray" />{' '}
                </Icon>
              }
            />
          </SplitItem>
        </Split>
      ))}
    </>
  );
};
