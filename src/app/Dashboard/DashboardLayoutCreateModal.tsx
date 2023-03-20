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
import { DashboardLayout } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import {
  dashboardConfigAddLayoutIntent,
  dashboardConfigRenameLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  RootState,
} from '@app/Shared/Redux/ReduxStore';
import { DashboardLayoutNamePattern } from '@app/Shared/Services/Api.service';
import { portalRoot } from '@app/utils/utils';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { DEFAULT_DASHBOARD_NAME } from './DashboardUtils';

export interface DashboardLayoutCreateModalProps {
  oldName?: string;
  visible: boolean;
  onClose: () => void;
}

export const DashboardLayoutCreateModal: React.FC<DashboardLayoutCreateModalProps> = ({ onClose, ...props }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);
  const [validated, setValidated] = React.useState<'default' | 'success' | 'warning' | 'error' | undefined>('default');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');

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
        setValidated('error');
        setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_REQUIRED'));
      } else if (dashboardConfigs.layouts.some((layout) => layout.name === value) || value === DEFAULT_DASHBOARD_NAME) {
        setValidated('error');
        setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_TAKEN'));
      } else {
        if (DashboardLayoutNamePattern.test(value)) {
          setValidated('success');
        } else {
          setValidated('error');
          setErrorMessage(t('DashboardLayoutCreateModal.ERROR.NAME_INVALID'));
        }
      }
    },
    [t, setName, setValidated, setErrorMessage, dashboardConfigs]
  );

  const handleClose = React.useCallback(
    (ev?: React.MouseEvent) => {
      ev && ev.stopPropagation();
      setName(props.oldName || '');
      setValidated('default');
      onClose();
    },
    [setName, setValidated, onClose, props.oldName]
  );

  const handleSubmit = React.useCallback(
    (ev?: React.MouseEvent) => {
      ev && ev.stopPropagation();
      const newLayout: DashboardLayout = {
        name: name,
        cards: [],
        favorite: false,
      };
      if (isCreateModal) {
        dispatch(dashboardConfigAddLayoutIntent(newLayout));
      } else {
        if (props.oldName !== undefined) {
          dispatch(dashboardConfigRenameLayoutIntent(props.oldName, name));
        }
      }
      dispatch(dashboardConfigReplaceLayoutIntent(name));
      setName('');
      onClose();
    },
    [dispatch, setName, onClose, name, isCreateModal, props.oldName]
  );

  const handleKeyUp = React.useCallback(
    (event: React.KeyboardEvent): void => {
      event.stopPropagation();
      if (event.code === 'Enter' && validated === 'success') {
        handleSubmit();
      }
    },
    [handleSubmit, validated]
  );

  const formGroup = React.useMemo(() => {
    return (
      <FormGroup
        label={t('DashboardLayoutCreateModal.NAME.LABEL')}
        fieldId="name"
        helperText={t('DashboardLayoutCreateModal.NAME.HELPER_TEXT')}
        helperTextInvalid={errorMessage}
        isRequired
        validated={validated}
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
        />
      </FormGroup>
    );
  }, [t, validated, errorMessage, name, handleNameChange, handleKeyUp]);

  const actionGroup = React.useMemo(() => {
    return (
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit} isAriaDisabled={validated !== 'success'}>
          {t('CREATE', { ns: 'common' })}
        </Button>
        <Button variant="link" onClick={handleClose}>
          {t('CANCEL', { ns: 'common' })}
        </Button>
      </ActionGroup>
    );
  }, [t, handleSubmit, validated, handleClose]);

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title={
        isCreateModal ? t('DashboardLayoutCreateModal.CREATE_LAYOUT') : t('DashboardLayoutCreateModal.RENAME_LAYOUT')
      }
    >
      <Form onSubmit={(e) => e.preventDefault()}>
        {formGroup}
        {actionGroup}
      </Form>
    </Modal>
  );
};
