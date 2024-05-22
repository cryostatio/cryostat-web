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
import { FUpload, MultiFileUpload, UploadCallbacks } from '@app/Shared/Components/FileUploads';
import { LoadingProps } from '@app/Shared/Components/types';
import { Rule } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, tap } from 'rxjs/operators';
import { isRule } from './utils';

export interface RuleUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const parseRule = (file: File): Observable<Rule> => {
  return from(
    file.text().then((content) => {
      const obj = JSON.parse(content);
      if (obj.id !== undefined) {
        delete obj.id;
      }
      if (isRule(obj)) {
        return obj;
      } else {
        throw new Error('Automated rule content is invalid.');
      }
    }),
  );
};

export const RuleUploadModal: React.FC<RuleUploadModalProps> = ({ onClose, ...props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [numOfFiles, setNumOfFiles] = React.useState(0);
  const [allOks, setAllOks] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const reset = React.useCallback(() => {
    setNumOfFiles(0);
    setUploading(false);
  }, [setNumOfFiles, setUploading]);

  const handleClose = React.useCallback(() => {
    if (uploading) {
      abortRef.current && abortRef.current.click();
    } else {
      reset();
      onClose();
    }
  }, [uploading, reset, onClose]);

  const onFileSubmit = React.useCallback(
    (fileUploads: FUpload[], { getProgressUpdateCallback, onSingleSuccess, onSingleFailure }: UploadCallbacks) => {
      setUploading(true);

      const tasks: Observable<boolean>[] = [];

      fileUploads.forEach((fileUpload) => {
        tasks.push(
          parseRule(fileUpload.file).pipe(
            first(),
            concatMap((rule) =>
              context.api.uploadRule(rule, getProgressUpdateCallback(fileUpload.file.name), fileUpload.abortSignal),
            ),
            tap({
              next: (_) => {
                onSingleSuccess(fileUpload.file.name);
              },
              error: (err) => {
                onSingleFailure(fileUpload.file.name, err);
              },
            }),
            catchError((_) => of(false)),
          ),
        );
      });

      addSubscription(
        forkJoin(tasks)
          .pipe(defaultIfEmpty([true]))
          .subscribe((oks) => {
            setUploading(false);
            setAllOks(oks.reduce((prev, curr, _) => prev && curr, true));
          }),
      );
    },
    [setUploading, context.api, addSubscription, setAllOks],
  );

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
  }, []);

  const onFilesChange = React.useCallback(
    (fileUploads: FUpload[]) => {
      setAllOks(!fileUploads.some((f) => !f.progress || f.progress.progressVariant !== 'success'));
      setNumOfFiles(fileUploads.length);
    },
    [setNumOfFiles, setAllOks],
  );

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-automated-rule',
        isLoading: uploading,
      }) as LoadingProps,
    [uploading],
  );

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Upload Automated rules"
      description="Select an Automated rules definition file to upload. File must be in valid JSON format."
      help={
        <Popover
          appendTo={portalRoot}
          headerContent={<div>What&quot;s this?</div>}
          bodyContent={
            <div>
              Automated rules are configurations that instruct Cryostat to create JDK Flight Recordings on matching
              target JVM applications. Each Automated rule specifies parameters for which Event Template to use, how
              much data should be kept in the application recording buffer, and how frequently Cryostat should copy the
              application recording buffer into Cryostat&quot;s own archived storage.
            </div>
          }
        >
          <Button variant="plain" aria-label="Help">
            <HelpIcon />
          </Button>
        </Popover>
      }
    >
      <Form>
        <FormGroup label="JSON file" isRequired fieldId="file">
          <MultiFileUpload
            submitRef={submitRef}
            abortRef={abortRef}
            uploading={uploading}
            dropZoneAccepts={['application/json']}
            displayAccepts={['JSON']}
            onFileSubmit={onFileSubmit}
            onFilesChange={onFilesChange}
          />
        </FormGroup>
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
                isDisabled={!numOfFiles || uploading}
                {...submitButtonLoadingProps}
              >
                Submit
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
