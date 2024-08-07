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
import { dashboardConfigCreateTemplateIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { portalRoot } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { ValidatedOptions } from '@patternfly/react-core/dist/js/helpers';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { LAYOUT_TEMPLATE_DESCRIPTION_WORD_LIMIT } from './const';
import { DashboardLayoutNamePattern, LayoutTemplateDescriptionPattern, templatize } from './utils';

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
    (ev?: KeyboardEvent | React.MouseEvent<Element, MouseEvent>) => {
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
    ],
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
          NotificationCategory.LayoutTemplateCreated,
        );
      }
      handleClose(ev);
    },
    [dispatch, handleClose, serviceContext.api, downloadModal, currLayout, name, description, notifications],
  );

  const handleNameChange = React.useCallback(
    (_, value: string) => {
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
    [t, setName, setNameValidated, setNameErrorMessage, templates],
  );

  const handleDescriptionChange = React.useCallback(
    (_, value: string) => {
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
    [t, setDescription, setDescriptionValidated, setDescriptionErrorMessage],
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
        <FormGroup label={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.NAME.LABEL')} fieldId="name" isRequired>
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={nameValidated}>
                {nameValidated === ValidatedOptions.error
                  ? nameErrorMessage
                  : t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.NAME.HELPER_TEXT')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
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
        <FormGroup label={t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.DESCRIPTION.LABEL')} fieldId="description">
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={descriptionValidated}>
                {descriptionValidated === ValidatedOptions.error
                  ? descriptionErrorMessage
                  : t('DashboardLayoutSetAsTemplateModal.FORM_GROUP.DESCRIPTION.HELPER_TEXT')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
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
