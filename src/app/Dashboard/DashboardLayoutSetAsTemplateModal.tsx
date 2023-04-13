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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { dashboardConfigCreateTemplateIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { portalRoot } from '@app/utils/utils';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, TextArea, TextInput } from '@patternfly/react-core';
import { ValidatedOptions } from '@patternfly/react-core/dist/js/helpers';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  DashboardLayoutNamePattern,
  LayoutTemplateDescriptionPattern,
  LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT,
  templatize,
} from './dashboard-utils';

export interface DashboardLayoutSetAsTemplateModalProps {
  visible: boolean;
  downloadModal?: boolean;
  onClose: () => void;
}

export const DashboardLayoutSetAsTemplateModal: React.FC<DashboardLayoutSetAsTemplateModalProps> = ({
  onClose,
  downloadModal = false,
  ...props
}) => {
  const dispatch = useDispatch();
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);
  const templates = dashboardConfigs.customTemplates;
  const serviceContext = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const [nameValidated, setNameValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [descriptionValidated, setDescriptionValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [nameErrorMessage, setNameErrorMessage] = React.useState('');
  const [descriptionErrorMessage, setDescriptionErrorMessage] = React.useState('');

  const currLayout = React.useMemo(() => dashboardConfigs.layouts[dashboardConfigs.current], [dashboardConfigs]);

  const handleClose = React.useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      ev && ev.stopPropagation();
      setName('');
      setDescription('');
      setNameValidated(ValidatedOptions.default);
      setDescriptionValidated(ValidatedOptions.default);
      setNameErrorMessage('');
      setDescriptionErrorMessage('');
      onClose();
    },
    [
      onClose,
      setName,
      setDescription,
      setNameValidated,
      setDescriptionValidated,
      setNameErrorMessage,
      setDescriptionErrorMessage,
    ]
  );

  const handleSubmit = React.useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (downloadModal) {
        serviceContext.api.downloadLayoutTemplate(templatize(currLayout, name, description));
      } else {
        dispatch(dashboardConfigCreateTemplateIntent(templatize(currLayout, name, description)));
        notifications.success(
          'Layout Template Created',
          `${name} was created as a layout template`,
          NotificationCategory.LayoutTemplateCreated
        );
      }
      handleClose(ev);
    },
    [dispatch, handleClose, serviceContext.api, downloadModal, currLayout, name, description, notifications]
  );

  const handleNameChange = React.useCallback(
    (value: string) => {
      setName(value);
      if (value.length === 0) {
        setNameValidated(ValidatedOptions.error);
        setNameErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_REQUIRED'));
      } else if (templates.some((layout) => layout.name === value)) {
        setNameValidated(ValidatedOptions.error);
        setNameErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_TAKEN'));
      } else {
        if (DashboardLayoutNamePattern.test(value)) {
          setNameValidated(ValidatedOptions.success);
          setNameErrorMessage('');
        } else {
          setNameValidated(ValidatedOptions.error);
          setNameErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_INVALID'));
        }
      }
    },
    [t, setName, setNameValidated, setNameErrorMessage, templates]
  );

  const handleDescriptionChange = React.useCallback(
    (value: string) => {
      setDescription(value);
      if (value.length === 0) {
        setDescriptionValidated(ValidatedOptions.default);
        setDescriptionErrorMessage('');
      } else if (value.length > LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT) {
        setDescriptionValidated(ValidatedOptions.error);
        setDescriptionErrorMessage(t('DashboardLayoutSetAsTemplateModal.ERROR.DESCRIPTION_TOO_LONG'));
      } else if (LayoutTemplateDescriptionPattern.test(value)) {
        setDescriptionValidated(ValidatedOptions.success);
        setDescriptionErrorMessage('');
      } else {
        setDescriptionValidated(ValidatedOptions.error);
        setDescriptionErrorMessage(t('DashboardLayoutSetAsTemplateModal.ERROR.DESCRIPTION_INVALID'));
      }
    },
    [t, setDescription, setDescriptionValidated, setDescriptionErrorMessage]
  );

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={props.visible}
      variant={ModalVariant.medium}
      showClose={true}
      onClose={handleClose}
      title={
        downloadModal
          ? t('DashboardLayoutSetAsTemplateModal.DOWNLOAD.TITLE')
          : t('DashboardLayoutSetAsTemplateModal.SET_TEMPLATE.TITLE')
      }
      description={
        downloadModal
          ? t(`DashboardLayoutSetAsTemplateModal.DOWNLOAD.DESCRIPTION`)
          : t(`DashboardLayoutSetAsTemplateModal.SET_TEMPLATE.DESCRIPTION`)
      }
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        <FormGroup
          label={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.NAME.LABEL')}
          fieldId="name"
          helperText={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.NAME.HELPER_TEXT')}
          helperTextInvalid={nameErrorMessage}
          isRequired
          validated={nameValidated}
        >
          <TextInput
            isRequired
            type="text"
            id="name"
            name="name"
            aria-describedby={'name-helper'}
            value={name}
            onChange={handleNameChange}
            autoFocus={true}
            autoComplete="on"
            validated={nameValidated}
            placeholder={currLayout.name}
          />
        </FormGroup>
        <FormGroup
          label={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.DESCRIPTION.LABEL')}
          fieldId="description"
          helperText={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.DESCRIPTION.HELPER_TEXT')}
          helperTextInvalid={descriptionErrorMessage}
          validated={descriptionValidated}
        >
          <TextArea
            type="text"
            id="description"
            name="description"
            aria-describedby={'description-helper'}
            value={description}
            onChange={handleDescriptionChange}
            validated={descriptionValidated}
            placeholder={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.DESCRIPTION.PLACEHOLDER')}
          />
        </FormGroup>
        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={nameValidated !== ValidatedOptions.success || descriptionValidated === ValidatedOptions.error}
          >
            {downloadModal ? t('DOWNLOAD', { ns: 'common' }) : t('SUBMIT', { ns: 'common' })}
          </Button>
          <Button variant="link" onClick={handleClose}>
            {t('CANCEL', { ns: 'common' })}
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
