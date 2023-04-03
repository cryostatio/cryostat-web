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
import { DashboardLayout, SerialCardConfig } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import {
  dashboardConfigAddLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  RootState,
} from '@app/Shared/Redux/ReduxStore';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first } from 'rxjs/operators';
import { DashboardLayoutNamePattern } from './DashboardUtils';

export interface DashboardLayoutUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DashboardLayoutUploadModal: React.FC<DashboardLayoutUploadModalProps> = ({ onClose, ...props }) => {
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);
  const { t } = useTranslation();
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [numOfFiles, setNumOfFiles] = React.useState(0);
  const [allOks, setAllOks] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (allOks && numOfFiles) {
      const latest = dashboardConfigs.layouts[dashboardConfigs.layouts.length - 1];
      dispatch(dashboardConfigReplaceLayoutIntent(latest.name));
    }
  }, [dispatch, dashboardConfigs, allOks, numOfFiles]);

  const parseDashboardLayoutFile = React.useCallback(
    (file: File): Observable<DashboardLayout> => {
      return from(
        file.text().then((content) => {
          let layout: DashboardLayout;
          try {
            layout = JSON.parse(content) as DashboardLayout;
          } catch (err) {
            throw new Error(t('DashboardLayoutUploadModal.ERROR.PARSE'));
          }
          if (!layout.name) {
            throw new Error(t('DashboardLayoutUploadModal.ERROR.NAME_INVALID.1', { name: layout.name }));
          }
          if (!DashboardLayoutNamePattern.test(layout.name)) {
            throw new Error(t('DashboardLayoutUploadModal.ERROR.NAME_INVALID.2'));
          }
          if (dashboardConfigs.layouts.some((l) => l.name === layout.name)) {
            throw new Error(t('DashboardLayoutUploadModal.ERROR.NAME_TAKEN', { name: layout.name }));
          }
          if (!Array.isArray(layout.cards)) {
            throw new Error(t('DashboardLayoutUploadModal.ERROR.CONFIG_INVALID'));
          }
          for (const cardConfig of layout.cards as SerialCardConfig[]) {
            if (
              Object.keys(cardConfig).length !== 3 ||
              cardConfig.name === undefined ||
              cardConfig.span === undefined ||
              cardConfig.props === undefined
            ) {
              throw new Error(t('DashboardLayoutUploadModal.ERROR.CONFIG_INVALID'));
            }
          }
          if (layout.favorite === undefined) {
            layout.favorite = false;
          }
          return layout;
        })
      );
    },
    [t, dashboardConfigs.layouts]
  );

  const reset = React.useCallback(() => {
    setNumOfFiles(0);
    setUploading(false);
  }, [setNumOfFiles, setUploading]);

  const handleClose = React.useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      ev && ev.stopPropagation();
      if (uploading) {
        abortRef.current && abortRef.current.click();
      } else {
        reset();
        onClose();
      }
    },
    [uploading, reset, onClose]
  );

  const onFileSubmit = React.useCallback(
    (
      fileUploads: FUpload[],
      { getProgressUpdateCallback: _getProgressUpdateCallback, onSingleSuccess, onSingleFailure }: UploadCallbacks
    ) => {
      setUploading(true);

      const tasks: Observable<DashboardLayout | null>[] = [];

      fileUploads.forEach((fileUpload) => {
        tasks.push(
          parseDashboardLayoutFile(fileUpload.file).pipe(
            first(),
            concatMap((layout) => {
              try {
                dispatch(dashboardConfigAddLayoutIntent(layout));
                onSingleSuccess(fileUpload.file.name);
                return of(layout);
              } catch (err) {
                // layout name already taken from previous layout upload
                onSingleFailure(
                  fileUpload.file.name,
                  new Error(t('DashboardLayoutUploadModal.ERROR.DUPLICATE_UPLOAD', { name: layout.name }))
                );
                return of(null);
              }
            }),
            catchError((err) => {
              onSingleFailure(fileUpload.file.name, err);
              return of(null);
            })
          )
        );
      });

      addSubscription(
        forkJoin(tasks)
          .pipe(defaultIfEmpty([null]))
          .subscribe((oks) => {
            setUploading(false);
            setAllOks(oks.every((o) => o !== null));
            const validLayouts = oks.filter((o) => o !== null) as DashboardLayout[];
            if (validLayouts.length > 0) {
              dispatch(dashboardConfigReplaceLayoutIntent(validLayouts[validLayouts.length - 1].name));
            }
          })
      );
    },
    [addSubscription, dispatch, t, parseDashboardLayoutFile, setUploading, setAllOks]
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
        spinnerAriaValueText: t('SUBMITTING', { ns: 'common' }),
        spinnerAriaLabel: 'submitting-dashboard-layouts',
        isLoading: uploading,
      } as LoadingPropsType),
    [t, uploading]
  );

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title={t('DashboardLayoutUploadModal.TITLE')}
      description={t(`DashboardLayoutUploadModal.DESCRIPTION`)}
      help={
        <Popover
          headerContent={<div>{t('WHATS_THIS', { ns: 'common' })}</div>}
          bodyContent={<div>{t(`DashboardLayoutUploadModal.HELP.CONTENT`)}</div>}
          appendTo={portalRoot}
        >
          <Button variant="plain" aria-label={t('HELP', { ns: 'common' })}>
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
              {t('CLOSE', { ns: 'common' })}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isDisabled={!numOfFiles || uploading}
                {...submitButtonLoadingProps}
              >
                {t('SUBMIT', { ns: 'common' })}
              </Button>
              <Button variant="link" onClick={handleClose}>
                {t('CANCEL', { ns: 'common' })}
              </Button>
            </>
          )}
        </ActionGroup>
      </Form>
    </Modal>
  );
};
