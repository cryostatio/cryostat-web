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
  FormSection,
  Modal,
  TextInput,
  Title,
  TitleSizes,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { BlankLayout } from './cryostat-dashboard-templates';
import {
  DashboardLayoutNamePattern,
  DEFAULT_DASHBOARD_NAME,
  layoutize,
  LayoutTemplate,
  LayoutTemplateContext,
} from './dashboard-utils';
import { LayoutTemplatePicker } from './LayoutTemplatePicker';

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
    (value: string) => {
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
    [t, setName, setNameValidated, setErrorMessage, dashboardConfigs]
  );

  const handleClose = React.useCallback(
    (ev?: React.MouseEvent) => {
      ev && ev.stopPropagation();
      setName(props.oldName || '');
      setNameValidated(ValidatedOptions.default);
      onClose();
    },
    [setName, setNameValidated, onClose, props.oldName]
  );

  const handleSubmit = React.useCallback(
    (ev?: React.MouseEvent) => {
      ev && ev.stopPropagation();
      if (nameValidated === ValidatedOptions.success && selectedTemplate) {
        if (isCreateModal) {
          const newLayout = layoutize(selectedTemplate, name);
          dispatch(dashboardConfigCreateLayoutIntent(newLayout));
          if (selectedTemplate !== BlankLayout) {
            dispatch(dashboardConfigTemplateHistoryPushIntent(selectedTemplate));
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
    [dispatch, handleClose, selectedTemplate, name, nameValidated, isCreateModal, props.oldName]
  );

  const handleKeyUp = React.useCallback(
    (ev: React.KeyboardEvent): void => {
      ev.stopPropagation();
      if (ev.code === 'Enter' && nameValidated === ValidatedOptions.success) {
        handleSubmit();
      }
    },
    [handleSubmit, nameValidated]
  );

  const onTemplateSelect = React.useCallback(
    (template: LayoutTemplate) => {
      setSelectedTemplate(template);
    },
    [setSelectedTemplate]
  );

  const formGroup = React.useMemo(() => {
    return (
      <FormSection>
        {isCreateModal && (
          <FormGroup label={'Template'} fieldId="template" isRequired height="35em" validated={nameValidated}>
            <div style={{ border: '1px solid var(--pf-global--BorderColor--100)', height: '33em' }}>
              <LayoutTemplatePicker onTemplateSelect={onTemplateSelect} />
            </div>
          </FormGroup>
        )}
        <FormGroup
          label={t('DashboardLayoutCreateModal.NAME.LABEL')}
          fieldId="name"
          helperText={t('DashboardLayoutCreateModal.NAME.HELPER_TEXT')}
          helperTextInvalid={errorMessage}
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
            onKeyUp={handleKeyUp}
            autoFocus={true}
            autoComplete="on"
            validated={nameValidated}
          />
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
    [t, isCreateModal]
  );

  return (
    <Modal
      aria-label={t('DashboardLayoutCreateModal.LABEL')}
      width={isCreateModal ? '110em' : '40%'}
      height={isCreateModal ? '90%' : 'auto'}
      appendTo={portalRoot}
      isOpen={props.visible}
      showClose={true}
      onClose={handleClose}
      header={header}
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        {formGroup}
        {actionGroup}
      </Form>
    </Modal>
  );
};
