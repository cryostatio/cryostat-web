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
import {
  dashboardConfigCreateLayoutIntent,
  dashboardConfigRenameLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  dashboardConfigTemplateHistoryPushIntent,
  RootState,
} from '@app/Shared/Redux/ReduxStore';
import { portalRoot } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Modal,
  TextInput,
  Title,
  TitleSizes,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { DEFAULT_DASHBOARD_NAME } from './const';
import { BlankLayout } from './cryostat-dashboard-templates';
import { LayoutTemplatePicker } from './LayoutTemplatePicker';
import { SelectedLayoutTemplate } from './types';
import { DashboardLayoutNamePattern, layoutize, LayoutTemplateContext } from './utils';

export interface DashboardLayoutCreateModalProps {
  oldName?: string;
  visible: boolean;
  onClose: () => void;
}

export const DashboardLayoutCreateModal: React.FC<DashboardLayoutCreateModalProps> = ({ onClose, ...props }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);
  const [nameValidated, setNameValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const { selectedTemplate, setSelectedTemplate } = React.useContext(LayoutTemplateContext);

  React.useEffect(() => {
    setName(props.oldName || '');
  }, [setName, props.oldName]);

  const isCreateModal = React.useMemo((): boolean => {
    return props.oldName === undefined;
  }, [props.oldName]);

  const handleNameChange = React.useCallback(
    (_, value: string) => {
      setName(value);
      if (value.length === 0) {
        setNameValidated(ValidatedOptions.error);
        setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_REQUIRED'));
      } else if (value.length > 20) {
        setNameValidated(ValidatedOptions.error);
        setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_TOO_LONG'));
      } else if (dashboardConfigs.layouts.some((layout) => layout.name === value) || value === DEFAULT_DASHBOARD_NAME) {
        setNameValidated(ValidatedOptions.error);
        setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_TAKEN'));
      } else {
        if (DashboardLayoutNamePattern.test(value)) {
          setNameValidated(ValidatedOptions.success);
        } else {
          setNameValidated(ValidatedOptions.error);
          setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_INVALID'));
        }
      }
    },
    [t, setName, setNameValidated, setErrorMessage, dashboardConfigs],
  );

  const handleClose = React.useCallback(
    (ev?: React.MouseEvent<Element, MouseEvent> | KeyboardEvent) => {
      ev && ev.stopPropagation();
      setName(props.oldName || '');
      setNameValidated(ValidatedOptions.default);
      onClose();
    },
    [setName, setNameValidated, onClose, props.oldName],
  );

  const handleSubmit = React.useCallback(
    (ev?: React.MouseEvent) => {
      ev && ev.stopPropagation();
      if (nameValidated === ValidatedOptions.success && selectedTemplate) {
        if (isCreateModal) {
          const newLayout = layoutize(selectedTemplate.template, name);
          dispatch(dashboardConfigCreateLayoutIntent(newLayout));
          if (selectedTemplate.template !== BlankLayout) {
            dispatch(dashboardConfigTemplateHistoryPushIntent(selectedTemplate.template));
          }
          dispatch(dashboardConfigReplaceLayoutIntent(newLayout.name));
        } else {
          if (props.oldName !== undefined) {
            dispatch(dashboardConfigRenameLayoutIntent(props.oldName, name));
          }
        }
      }
      handleClose();
    },
    [dispatch, handleClose, selectedTemplate, name, nameValidated, isCreateModal, props.oldName],
  );

  const handleKeyUp = React.useCallback(
    (ev: React.KeyboardEvent): void => {
      ev.stopPropagation();
      if (ev.code === 'Enter' && nameValidated === ValidatedOptions.success) {
        handleSubmit();
      }
    },
    [handleSubmit, nameValidated],
  );

  const onTemplateSelect = React.useCallback(
    (template: SelectedLayoutTemplate) => {
      setSelectedTemplate(template);
    },
    [setSelectedTemplate],
  );

  const formGroup = React.useMemo(() => {
    return (
      <FormSection>
        {isCreateModal && (
          <FormGroup label={'Template'} fieldId="template" isRequired>
            <div style={{ border: '1px solid var(--pf-v5-global--BorderColor--100)', height: '50vh' }}>
              <LayoutTemplatePicker onTemplateSelect={onTemplateSelect} />
            </div>
          </FormGroup>
        )}
        <FormGroup label={t('DashboardLayoutCreateModal.NAME.LABEL')} fieldId="name" isRequired>
          <TextInput
            isRequired
            type="text"
            id="name"
            name="name"
            aria-describedby={'name-helper'}
            value={name}
            onChange={handleNameChange}
            onKeyUp={handleKeyUp}
            autoFocus={true}
            autoComplete="on"
            validated={nameValidated}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={nameValidated}>
                {nameValidated === ValidatedOptions.error
                  ? errorMessage
                  : t('DashboardLayoutCreateModal.NAME.HELPER_TEXT')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
    );
  }, [t, isCreateModal, nameValidated, errorMessage, name, onTemplateSelect, handleNameChange, handleKeyUp]);

  const actionGroup = React.useMemo(() => {
    return (
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit} isAriaDisabled={nameValidated !== 'success'}>
          {isCreateModal ? t('CREATE', { ns: 'common' }) : t('RENAME', { ns: 'common' })}
        </Button>
        <Button variant="link" onClick={handleClose}>
          {t('CANCEL', { ns: 'common' })}
        </Button>
      </ActionGroup>
    );
  }, [t, handleSubmit, handleClose, nameValidated, isCreateModal]);

  const header = React.useMemo(
    () => (
      <Title id="modal-custom-header-label" headingLevel="h1" size={TitleSizes['2xl']}>
        {isCreateModal ? t('DashboardLayoutCreateModal.CREATE_LAYOUT') : t('DashboardLayoutCreateModal.RENAME_LAYOUT')}
      </Title>
    ),
    [t, isCreateModal],
  );

  return (
    <Modal
      aria-label={t('DashboardLayoutCreateModal.LABEL')}
      width={isCreateModal ? '80%' : '40%'}
      appendTo={portalRoot}
      isOpen={props.visible}
      showClose={true}
      header={header}
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        {formGroup}
        {actionGroup}
      </Form>
    </Modal>
  );
};
