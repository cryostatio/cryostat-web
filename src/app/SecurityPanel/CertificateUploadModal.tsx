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
import { ActionGroup, Button, FileUpload, Form, FormGroup, Modal, ModalVariant } from '@patternfly/react-core';
import { first } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';

export interface CertificateUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CertificateUploadModal: React.FunctionComponent<CertificateUploadModalProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [uploadFile, setUploadFile] = React.useState(undefined as File | undefined);
  const [filename, setFilename] = React.useState('' as string | undefined);
  const [uploading, setUploading] = React.useState(false);
  const [rejected, setRejected] = React.useState(false);

  const reset = React.useCallback(() => {
    setUploadFile(undefined);
    setFilename('');
    setUploading(false);
    setRejected(true);
  }, [setUploadFile, setFilename, setUploading, setRejected]);

  const handleFileChange = React.useCallback(
    (file, filename) => {
      setRejected(false);
      setUploadFile(file);
      setFilename(filename);
    },
    [setRejected, setUploadFile, setFilename]
  );

  const handleReject = React.useCallback(() => {
    setRejected(true);
  }, [setRejected]);

  const handleClose = React.useCallback(() => {
    reset();
    props.onClose();
  }, [reset, props.onClose]);

  const handleSubmit = React.useCallback(() => {
    if (rejected) {
      notifications.warning('File format is not compatible');
      return;
    }
    if (!uploadFile) {
      notifications.warning('Attempted to submit certificate upload without a file selected');
      return;
    }
    let type = uploadFile.type;
    if (type != 'application/x-x509-ca-cert' && type != 'application/pkix-cert') {
      notifications.warning('File format is not compatible');
      return;
    }
    setUploading(true);
    context.api
      .uploadSSLCertificate(uploadFile)
      .pipe(first())
      .subscribe((success) => {
        setUploading(false);
        if (success) {
          handleClose();
        } else {
          reset();
        }
      });
  }, [rejected, uploadFile, notifications, setUploading, context.api, handleClose, reset]);

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-ssl-certitficates',
        isLoading: uploading,
      } as LoadingPropsType),
    [uploading]
  );

  return (
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={!uploading}
      onClose={handleClose}
      title="Upload SSL certificate"
      description="Select a certificate file to upload. Certificates must be DER-encoded (can be binary or base64) and can have .der or .cer extensions."
    >
      <Form>
        <FormGroup label="Certificate File" isRequired fieldId="file" validated={rejected ? 'error' : 'default'}>
          <FileUpload
            id="file-upload"
            value={uploadFile}
            filename={filename}
            onChange={handleFileChange}
            isLoading={uploading}
            isDisabled={uploading}
            validated={rejected ? 'error' : 'default'}
            dropzoneProps={{
              accept: 'application/x-x509-ca-cert, application/pkix-cert',
              onDropRejected: handleReject,
            }}
          />
        </FormGroup>
        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!filename || uploading}
            {...submitButtonLoadingProps}
          >
            {uploading ? 'Submitting' : 'Submit'}
          </Button>
          <Button variant="link" onClick={handleClose} isDisabled={uploading}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
