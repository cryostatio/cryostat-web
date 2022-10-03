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
import { Prompt } from 'react-router-dom';
import { ActionGroup, Button, FileUpload, Form, FormGroup, Modal, ModalVariant } from '@patternfly/react-core';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { CancelUploadModal } from '@app/Modal/CancelUploadModal';
import { RecordingLabel } from './RecordingLabel';
import { from, Observable } from 'rxjs';
import { useSubscriptions } from '@app/utils/useSubscriptions';

export interface RecordingLabelUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (labels: RecordingLabel[]) => void;
}

export const parseLabels = (file: File): Observable<RecordingLabel[]> => {
  return from(
    file
      .text()
      .then(JSON.parse)
      .then((obj) => {
        const labels: RecordingLabel[] = [];
        const labelObj = obj['labels'];
        if (labelObj) {
          // Ifno
          Object.keys(labelObj).forEach((key) => {
            labels.push({
              key: key,
              value: labelObj[key],
            });
          });
        }
        return labels;
      })
  );
};

export const RecordingLabelUploadModal: React.FunctionComponent<RecordingLabelUploadModalProps> = (props) => {
  const notifications = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();

  const [uploadFile, setUploadFile] = React.useState(undefined as File | undefined);
  const [filename, setFilename] = React.useState('' as string | undefined);
  const [uploading, setUploading] = React.useState(false);
  const [rejected, setRejected] = React.useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = React.useState(false);
  const [abort, setAbort] = React.useState(new AbortController());

  const reset = React.useCallback(() => {
    setUploadFile(undefined);
    setFilename('');
    setUploading(false);
    setRejected(true);
    setShowCancelPrompt(false);
    setAbort(new AbortController());
  }, [setUploadFile, setFilename, setUploading, setRejected, setShowCancelPrompt, setAbort]);

  const handleFileChange = React.useCallback(
    (file, filename) => {
      setRejected(false);
      setUploadFile(file);
      setFilename(filename);
    },
    [setRejected, setUploadFile, setFilename]
  );

  const handleReject = React.useCallback(() => setRejected(true), [setRejected]);

  const handleClose = React.useCallback(() => {
    if (uploading) {
      setShowCancelPrompt(true);
    } else {
      reset();
      props.onClose();
    }
  }, [uploading, setShowCancelPrompt, reset, props.onClose]);

  const handleSubmit = React.useCallback(() => {
    if (!uploadFile) {
      notifications.warning('Attempted to submit JSON upload without a file selected');
      return;
    }
    setUploading(true);
    addSubscription(
      parseLabels(uploadFile).subscribe((labels) => {
        reset();
        props.onClose();
        props.onSubmit(labels);
      })
    );
  }, [notifications, setUploading, uploadFile, addSubscription, props.onSubmit, props.onClose, reset]);

  const handleAbort = React.useCallback(() => {
    abort.abort();
    reset();
    props.onClose();
  }, [abort.abort, reset, props.onClose]);

  const handleCancelClose = React.useCallback(() => setShowCancelPrompt(false), [setShowCancelPrompt]);

  return (
    <>
      <Prompt when={uploading} message="Are you sure you wish to cancel the file upload?" />
      <Modal
        isOpen={props.visible}
        variant={ModalVariant.medium}
        showClose={true}
        onClose={handleClose}
        title="Re-Upload Metadata for Archived Recording"
        description="Select a JSON file containing the metadata to upload."
      >
        <CancelUploadModal
          visible={showCancelPrompt}
          title="Upload in Progress"
          message="Are you sure you wish to cancel the file upload?"
          onYes={handleAbort}
          onNo={handleCancelClose}
        />
        <Form isHorizontal>
          <FormGroup label="JSON File" isRequired fieldId="file">
            <FileUpload
              id="file-upload"
              value={uploadFile}
              filename={filename}
              onChange={handleFileChange}
              isLoading={uploading}
              validated={rejected ? 'error' : 'default'}
              dropzoneProps={{
                accept: '.json',
                onDropRejected: handleReject,
              }}
            />
          </FormGroup>
          <ActionGroup>
            <Button variant="primary" onClick={handleSubmit} isDisabled={!filename}>
              Submit
            </Button>
            <Button variant="link" onClick={handleClose}>
              Cancel
            </Button>
          </ActionGroup>
        </Form>
      </Modal>
    </>
  );
};
