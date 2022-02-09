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
import { first } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { CancelUploadModal } from './CancelUploadModal';

export interface ArchiveUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ArchiveUploadModal: React.FunctionComponent<ArchiveUploadModalProps> = props => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
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

  const handleFileChange = React.useCallback((file, filename) => {
    setRejected(false);
    setUploadFile(file);
    setFilename(filename);
    setShowCancelPrompt(false);
  }, [setRejected, setUploadFile, setFilename, setShowCancelPrompt]);

  const handleReject = React.useCallback(() => {
    setRejected(true);
    setShowCancelPrompt(false);
  }, [setRejected, setShowCancelPrompt]);

  const handleClose = React.useCallback(() => {
    if (uploading) {
      setShowCancelPrompt(true);
    } else {
      reset();
      props.onClose();
    }
  }, [uploading, setShowCancelPrompt, reset]);

  const handleSubmit = React.useCallback(() => {
    if (!uploadFile) {
      notifications.warning('Attempted to submit JFR upload without a file selected');
      return;
    }
    setUploading(true);
    context.api.uploadRecording(uploadFile, abort.signal)
      .pipe(first())
      .subscribe(handleClose, reset);
  }, [context.api, notifications, setUploading, uploadFile, abort, handleClose, reset]);

  const handleAbort = React.useCallback(() => {
    abort.abort();
    reset();
    props.onClose();
  }, [abort, reset, handleClose]);

  return (<>
    <Prompt
      when={uploading}
      message="Are you sure you wish to cancel the file upload?"
    />
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Re-Upload Archived Recording"
      description="Select a JDK Flight Recorder file to re-upload. Files must be .jfr binary format and follow the naming convention used by Cryostat when archiving recordings."
      >
      <CancelUploadModal
        visible={showCancelPrompt}
        title="Upload in Progress"
        message="Are you sure you wish to cancel the file upload?"
        onYes={handleAbort}
        onNo={() => setShowCancelPrompt(false)}
      />
      <Form>
        <FormGroup
          label="JFR File"
          isRequired
          fieldId="file"
          validated={rejected ? 'error' : 'default'}
        >
          <FileUpload
            id="file-upload"
            value={uploadFile}
            filename={filename}
            onChange={handleFileChange}
            isLoading={uploading}
            validated={rejected ? 'error' : 'default'}
            dropzoneProps={{
              accept: '.jfr',
              onDropRejected: handleReject
            }}
          />
        </FormGroup>
        <ActionGroup>
          <Button variant="primary" onClick={handleSubmit} isDisabled={!filename}>Submit</Button>
          <Button variant="link" onClick={handleClose}>Cancel</Button>
        </ActionGroup>
      </Form>
    </Modal>
  </>);
};
