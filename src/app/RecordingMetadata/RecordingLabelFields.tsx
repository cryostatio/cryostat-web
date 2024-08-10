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
import { KeyValue, keyValueToString } from '@app/Shared/Services/api.types';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  ActionList,
  ActionListItem,
  Button,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  List,
  ListItem,
  Popover,
  Text,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, FileIcon, UploadIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { catchError, Observable, of, zip } from 'rxjs';
import { isValidLabel, getValidatedOption, isDuplicateKey, parseLabelsFromFile, getLabelFromInput } from './utils';

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

  const handleAddLabelButtonClick = React.useCallback(() => {
    setLabels([...labels, { key: 'key', value: 'value' }]);
  }, [labels, setLabels]);

  const handleLabelEdit = React.useCallback(
    (idx: number, keyValue: string) => {
      const label = getLabelFromInput(keyValue);
      if (label) {
        const updatedLabels = [...labels];
        updatedLabels[idx] = label;
        setLabels(updatedLabels);
      }
    },
    [labels, setLabels],
  );

  const handleDeleteLabelButtonClick = React.useCallback(
    (idx: number) => {
      const updated = [...labels];
      updated.splice(idx, 1);
      setLabels(updated);
    },
    [labels, setLabels],
  );

  React.useEffect(() => {
    const valid = labels.reduce((prev, curr) => isValidLabel(curr) && !isDuplicateKey(curr.key, labels) && prev, true);
    setValid(getValidatedOption(valid));
  }, [setValid, labels]);

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

  const validLabels: boolean[] = React.useMemo(() => {
    const arr = Array(labels.length).fill(false);
    labels.forEach((label, index) => {
      if (label.key.length > 0) {
        arr[index] = isValidLabel(label) && !isDuplicateKey(label.key, labels);
      } // Ignore initial empty key inputs
    });
    return arr;
  }, [labels, isDuplicateKey]);

  return loading ? (
    <LoadingView />
  ) : (
    <>
      {isUploadable && (
        <>
          <ActionList style={{ marginBottom: '1em' }}>
            <ActionListItem>
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
                  variant="secondary"
                  isDisabled={isDisabled}
                >
                  <UploadIcon />
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
            </ActionListItem>
          </ActionList>
        </>
      )}
      <LabelGroup
        categoryName="Recording Labels"
        numLabels={5}
        isEditable
        addLabelControl={
          <Label color="blue" variant="outline" isDisabled={isDisabled} onClick={handleAddLabelButtonClick}>
            Add label
          </Label>
        }
      >
        {labels.map((label, idx) => (
          <Label
            key={label.key}
            id={label.key}
            color={validLabels[idx] ? 'grey' : 'red'}
            isEditable
            onClose={() => handleDeleteLabelButtonClick(idx)}
            isDisabled={isDisabled}
            onEditCancel={(_, prevText) => handleLabelEdit(idx, prevText)}
            onEditComplete={(_, newText) => handleLabelEdit(idx, newText)}
          >
            {keyValueToString(label)}
          </Label>
        ))}
      </LabelGroup>
      {validLabels.some((v) => !v) ? (
        <HelperText>
          <HelperTextItem variant="error">Keys must be unique. Labels should not contain empty spaces.</HelperTextItem>
        </HelperText>
      ) : null}
    </>
  );
};
