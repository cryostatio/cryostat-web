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
import { dashboardConfigCreateTemplateIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, Popover, Text } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first } from 'rxjs/operators';
import {
  DashboardLayoutNamePattern,
  LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT,
  LayoutTemplate,
  LayoutTemplateContext,
  LayoutTemplateDescriptionPattern,
  LayoutTemplateVendor,
  LayoutTemplateVersion,
  SerialLayoutTemplate,
  mockSerialCardConfig,
  mockSerialLayoutTemplate,
  getDashboardCards,
} from './dashboard-utils';
import { smallestFeatureLevel } from './LayoutTemplateGroup';

export interface LayoutTemplateUploadModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LayoutTemplateUploadModal: React.FC<LayoutTemplateUploadModalProps> = ({ onClose, ...props }) => {
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const { setSelectedTemplate } = React.useContext(LayoutTemplateContext);
  const customTemplates = useSelector((state: RootState) => state.dashboardConfigs.customTemplates);
  const { t } = useTranslation();
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [numOfFiles, setNumOfFiles] = React.useState(0);
  const [allOks, setAllOks] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const validateParseTemplate = React.useCallback(
    (file: File): Observable<LayoutTemplate> => {
      return from(
        file.text().then((content) => {
          let template: SerialLayoutTemplate;
          try {
            template = JSON.parse(content);
          } catch (err) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.PARSE'));
          }
          if (
            !('name' in template && 'description' in template && 'cards' in template && 'version' in template) ||
            Object.keys(template).length !== Object.keys(mockSerialLayoutTemplate).length
          ) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.TEMPLATE_INVALID'));
          }
          if (!template.name || !DashboardLayoutNamePattern.test(template.name)) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.NAME_INVALID'));
          }
          if (
            !template.description ||
            !LayoutTemplateDescriptionPattern.test(template.description) ||
            template.description.length > LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT
          ) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.DESCRIPTION_INVALID'));
          }
          if (customTemplates.some((v) => v.name === template.name)) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.NAME_TAKEN', { name: template.name }));
          }
          if (!Array.isArray(template.cards)) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.CONFIG_INVALID'));
          }
          for (const cardConfig of template.cards) {
            if (
              Object.keys(cardConfig).length !== Object.keys(mockSerialCardConfig).length ||
              cardConfig.name === undefined ||
              !getDashboardCards()
                .map((c) => c.component.name)
                .includes(cardConfig.name) ||
              cardConfig.span === undefined ||
              cardConfig.props === undefined
            ) {
              throw new Error(t('LayoutTemplateUploadModal.ERROR.CONFIG_INVALID'));
            }
          }
          if (!(template.version in LayoutTemplateVersion)) {
            throw new Error(t('LayoutTemplateUploadModal.ERROR.VERSION_INVALID'));
          }
          // all uploaded templates are user-submitted
          return {
            name: template.name,
            description: template.description,
            version: template.version,
            cards: template.cards,
            vendor: LayoutTemplateVendor.USER,
          } as LayoutTemplate;
        })
      );
    },
    [t, customTemplates]
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

      const tasks: Observable<SerialLayoutTemplate | null>[] = [];

      fileUploads.forEach((fileUpload) => {
        tasks.push(
          validateParseTemplate(fileUpload.file).pipe(
            first(),
            concatMap((template) => {
              try {
                dispatch(dashboardConfigCreateTemplateIntent(template));
                const cardLevel = smallestFeatureLevel(template.cards);
                if (cardLevel <= FeatureLevel.BETA) {
                  onSingleSuccess(
                    fileUpload.file.name,
                    <Text component="p" style={{ color: 'var(--pf-global--warning-color--200)' }}>
                      Warning: To see this template in the template picker, make sure the Cryostat Feature Level is set
                      to BETA.
                    </Text>
                  );
                } else {
                  onSingleSuccess(fileUpload.file.name);
                }
                return of(template);
              } catch (err) {
                // template name already taken from previous upload
                onSingleFailure(
                  fileUpload.file.name,
                  new Error(t('LayoutTemplateUploadModal.ERROR.DUPLICATE_UPLOAD', { name: template.name }))
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
            const validLayouts = oks.filter((o) => o !== null) as LayoutTemplate[];
            if (validLayouts.length > 0) {
              setSelectedTemplate({
                template: validLayouts[0],
                category: 'User-submitted',
              });
            }
          })
      );
    },
    [addSubscription, dispatch, t, validateParseTemplate, setUploading, setSelectedTemplate, setAllOks]
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
        spinnerAriaLabel: 'submitting-layout-templates',
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
      title={t('LayoutTemplateUploadModal.TITLE')}
      description={t(`LayoutTemplateUploadModal.DESCRIPTION`)}
      help={
        <Popover
          headerContent={<div>{t('WHATS_THIS', { ns: 'common' })}</div>}
          bodyContent={<div>{t(`LayoutTemplateUploadModal.HELP.CONTENT`)}</div>}
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
