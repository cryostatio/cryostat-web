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
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant } from '@patternfly/react-core';
import * as React from 'react';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, tap } from 'rxjs/operators';

export interface CertificateUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CertificateUploadModal: React.FC<CertificateUploadModalProps> = ({ visible, onClose }) => {
  const addSubscriptions = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [allOks, setAllOks] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [numOfFiles, setNumOfFiles] = React.useState(0);

  const reset = React.useCallback(() => {
    setUploading(false);
    setNumOfFiles(0);
  }, [setUploading, setNumOfFiles]);

  const onFilesChange = React.useCallback(
    (fileUploads: FUpload[]) => {
      setAllOks(!fileUploads.some((f) => !f.progress || f.progress.progressVariant !== 'success'));
      setNumOfFiles(fileUploads.length);
    },
    [setNumOfFiles, setAllOks],
  );

  const handleClose = React.useCallback(() => {
    if (uploading) {
      abortRef.current && abortRef.current.click();
    } else {
      reset();
      onClose();
    }
  }, [uploading, reset, onClose]);

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
  }, []);

  const onFileSubmit = React.useCallback(
    (fileUploads: FUpload[], { getProgressUpdateCallback, onSingleSuccess, onSingleFailure }: UploadCallbacks) => {
      setUploading(true);

      const tasks: Observable<boolean>[] = [];
      fileUploads.forEach((fileUpload) => {
        tasks.push(
          context.api
            .uploadSSLCertificate(
              fileUpload.file,
              getProgressUpdateCallback(fileUpload.file.name),
              fileUpload.abortSignal,
            )
            .pipe(
              tap({
                next: () => {
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

      addSubscriptions(
        forkJoin(tasks)
          .pipe(defaultIfEmpty([true]))
          .subscribe((oks) => {
            setUploading(false);
            setAllOks(oks.reduce((prev, curr, _) => prev && curr, true));
          }),
      );
    },
    [setUploading, context.api, addSubscriptions, setAllOks],
  );

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-ssl-certificates',
        isLoading: uploading,
      }) as LoadingProps,
    [uploading],
  );

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Upload SSL certificate"
      description="Select a certificate file to upload. Certificates must be DER-encoded (can be binary or base64) and can have .der or .cer extensions."
    >
      <Form>
        <FormGroup label="Certificate File" isRequired fieldId="file">
          <MultiFileUpload
            submitRef={submitRef}
            abortRef={abortRef}
            uploading={uploading}
            dropZoneAccepts={['application/x-x509-ca-cert', 'application/pkix-cert']}
            displayAccepts={['CER', 'DER']}
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
