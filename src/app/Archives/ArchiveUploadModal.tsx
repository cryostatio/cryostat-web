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
import { RecordingLabel } from '@app/RecordingMetadata/RecordingLabel';
import { RecordingLabelFields } from '@app/RecordingMetadata/RecordingLabelFields';
import { FUpload, MultiFileUpload, UploadCallbacks } from '@app/Shared/FileUploads';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  ExpandableSection,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Text,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, tap } from 'rxjs/operators';

export interface ArchiveUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ArchiveUploadModal: React.FC<ArchiveUploadModalProps> = ({ onClose, ...props }) => {
  const addSubscriptions = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [uploading, setUploading] = React.useState(false);
  const [numOfFiles, setNumOfFiles] = React.useState(0);
  const [allOks, setAllOks] = React.useState(false);
  const [labels, setLabels] = React.useState([] as RecordingLabel[]);
  const [valid, setValid] = React.useState(ValidatedOptions.success);

  const getFormattedLabels = React.useCallback(() => {
    const formattedLabels = {};
    labels.forEach((l) => {
      if (l.key && l.value) {
        formattedLabels[l.key] = l.value;
      }
    });
    return formattedLabels;
  }, [labels]);

  const reset = React.useCallback(() => {
    setUploading(false);
    setLabels([] as RecordingLabel[]);
    setValid(ValidatedOptions.success);
    setNumOfFiles(0);
  }, [setUploading, setLabels, setValid, setNumOfFiles]);

  const handleClose = React.useCallback(() => {
    if (uploading) {
      abortRef.current && abortRef.current.click();
    } else {
      reset();
      onClose();
    }
  }, [uploading, abortRef, reset, onClose]);

  const onFileSubmit = React.useCallback(
    (fileUploads: FUpload[], { getProgressUpdateCallback, onSingleSuccess, onSingleFailure }: UploadCallbacks) => {
      setUploading(true);

      const tasks: Observable<string | undefined>[] = [];

      fileUploads.forEach((fileUpload) => {
        tasks.push(
          context.api
            .uploadRecording(
              fileUpload.file,
              getFormattedLabels(),
              getProgressUpdateCallback(fileUpload.file.name),
              fileUpload.abortSignal
            )
            .pipe(
              tap({
                next: (_) => {
                  onSingleSuccess(fileUpload.file.name);
                },
                error: (err) => {
                  onSingleFailure(fileUpload.file.name, err);
                },
              }),
              catchError((_) => of(undefined))
            )
        );
      });

      addSubscriptions(
        forkJoin(tasks)
          .pipe(defaultIfEmpty(['']))
          .subscribe((savedNames) => {
            setUploading(false);
            setAllOks(!savedNames.some((name) => name === undefined));
          })
      );
    },
    [addSubscriptions, context.api, setUploading, getFormattedLabels, setAllOks]
  );

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
  }, [submitRef]);

  const onFilesChange = React.useCallback(
    (fileUploads: FUpload[]) => {
      setAllOks(!fileUploads.some((f) => !f.progress || f.progress.progressVariant !== 'success'));
      setNumOfFiles(fileUploads.length);
    },
    [setNumOfFiles, setAllOks]
  );

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-uploaded-recording',
        isLoading: uploading,
      } as LoadingPropsType),
    [uploading]
  );

  return (
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Re-Upload Archived Recording"
      description={
        <Text>
          <span>
            Select a JDK Flight Recorder file to re-upload. Files must be .jfr binary format and follow the naming
            convention used by Cryostat when archiving recordings
          </span>{' '}
          <Tooltip
            content={
              <Text>
                Archive naming conventions: <b>target-name_recordingName_timestamp.jfr</b>.
                <br />
                For example: io-cryostat-Cryostat_profiling_timestamp.jfr
              </Text>
            }
            appendTo={portalRoot}
          >
            <sup style={{ cursor: 'pointer' }}>
              <b>[?]</b>
            </sup>
          </Tooltip>
          <span>.</span>
        </Text>
      }
    >
      <Form>
        <FormGroup label="JFR File" isRequired fieldId="file">
          <MultiFileUpload
            submitRef={submitRef}
            abortRef={abortRef}
            uploading={uploading}
            displayAccepts={['JFR']}
            onFileSubmit={onFileSubmit}
            onFilesChange={onFilesChange}
          />
        </FormGroup>
        <ExpandableSection toggleTextExpanded="Hide metadata options" toggleTextCollapsed="Show metadata options">
          <FormGroup
            label="Labels"
            fieldId="labels"
            labelIcon={
              <Tooltip
                content={<Text>Unique key-value pairs containing information about the recording.</Text>}
                appendTo={portalRoot}
              >
                <HelpIcon noVerticalAlign />
              </Tooltip>
            }
          >
            <RecordingLabelFields
              isUploadable
              labels={labels}
              setLabels={setLabels}
              setValid={setValid}
              isDisabled={uploading}
            />
          </FormGroup>
        </ExpandableSection>
        <ActionGroup>
          {allOks && numOfFiles ? (
            <Button variant="primary" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isDisabled={!numOfFiles || valid !== ValidatedOptions.success || uploading}
                {...submitButtonLoadingProps}
              >
                {uploading ? 'Submitting' : 'Submit'}
              </Button>
              <Button variant="link" onClick={handleClose}>
                Cancel
              </Button>
            </>
          )}
        </ActionGroup>
      </Form>
    </Modal>
  );
};
