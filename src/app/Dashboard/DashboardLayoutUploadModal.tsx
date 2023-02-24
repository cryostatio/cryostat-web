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
import { FUpload, MultiFileUpload, UploadCallbacks } from '@app/Shared/FileUploads';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import {
  CardConfig,
  DashboardConfigState,
  dashboardLayoutConfigReplaceCardIntent,
} from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { forkJoin, from, Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, map, tap } from 'rxjs/operators';

export interface DashboardLayoutUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

const validateDashboardLayout = (obj: any): obj is DashboardConfigState => {
  const layout = obj as DashboardConfigState;
  if (layout.name === undefined || !Array.isArray(layout.list)) {
    console.log('Invalid layout name or list');

    return false;
  }
  for (const cardConfig of layout.list as CardConfig[]) {
    if (
      Object.keys(cardConfig).length !== 3 ||
      cardConfig.name === undefined ||
      cardConfig.span === undefined ||
      cardConfig.props === undefined
    ) {
      console.log('Invalid card config');
      // console log all the things im checking
      console.log(Object.keys(cardConfig).length);
      console.log(cardConfig.name);
      console.log(cardConfig.span);
      console.log(cardConfig.props);

      return false;
    }
  }
  return true;
};

export const parseCardConfig = (file: File): Observable<DashboardConfigState> => {
  return from(
    file.text().then((content) => {
      const obj = JSON.parse(content);
      if (validateDashboardLayout(obj)) {
        return obj;
      } else {
        throw new Error('Card configurations are invalid.');
      }
    })
  );
};

export const DashboardLayoutUploadModal: React.FC<DashboardLayoutUploadModalProps> = ({ onClose, ...props }) => {
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const context = React.useContext(ServiceContext);
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [numOfFiles, setNumOfFiles] = React.useState(0);
  const [allOks, setAllOks] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  // TODO: allow user to pick which layout to use from the uploaded file(s)
  const [_config, _setConfig] = React.useState<CardConfig[]>([]);
  const [_layoutName, _setLayoutName] = React.useState(null);

  React.useEffect(() => {
    if (allOks && numOfFiles) {
      context.settings.dashboardLayouts().subscribe((layouts) => {
        if (layouts.length > 0) {
          const latest = layouts[layouts.length - 1];
          dispatch(dashboardLayoutConfigReplaceCardIntent(latest.name, latest.list));
        }
      });
    }
  }, [context.settings, dispatch, allOks, numOfFiles]);

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
          parseCardConfig(fileUpload.file).pipe(
            first(),
            concatMap((layout) => {
              return context.settings.dashboardLayouts().pipe(
                map((layouts) => layouts.filter((l) => l.name === layout.name)),
                concatMap((found) => {
                  if (found.length > 0) {
                    return throwError(() => new Error(`Dashboard layout with name ${layout.name} already exists.`));
                  }
                  context.settings.setDashboardLayouts(layout);
                  return of(true);
                }),
                first()
              );
            }),
            tap({
              next: (_) => {
                onSingleSuccess(fileUpload.file.name);
              },
              error: (err) => {
                onSingleFailure(fileUpload.file.name, err);
              },
            }),
            catchError((_) => of(false))
          )
        );
      });

      addSubscription(
        forkJoin(tasks)
          .pipe(defaultIfEmpty([true]))
          .subscribe((oks) => {
            setUploading(false);
            setAllOks(oks.reduce((prev, curr, _) => prev && curr, true));
          })
      );
    },
    [setUploading, context.settings, addSubscription, setAllOks]
  );

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
  }, []);

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
        spinnerAriaLabel: 'submitting-dashboard-layouts',
        isLoading: uploading,
      } as LoadingPropsType),
    [uploading]
  );

  return (
    <>
      <Modal
        isOpen={props.visible}
        variant={ModalVariant.large}
        showClose={true}
        onClose={handleClose}
        title="Upload Dashboard Layout"
        description="Select Dashboard Layout configuration file(s) to upload. File(s) must be in valid JSON format."
        help={
          <Popover headerContent={<div>What&quot;s this?</div>} bodyContent={<div>Something</div>}>
            <Button variant="plain" aria-label="Help">
              <HelpIcon />
            </Button>
          </Popover>
        }
      >
        <Form>
          <FormGroup label="JSON File" isRequired fieldId="file">
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
    </>
  );
};
