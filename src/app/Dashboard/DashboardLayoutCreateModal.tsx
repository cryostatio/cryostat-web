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
  _dashboardConfigVersion,
} from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { ActionGroup, Button, Form, FormGroup, Modal, ModalVariant, Popover, TextInput } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { set } from 'immer/dist/internal';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { forkJoin, from, Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, map, tap } from 'rxjs/operators';

export interface DashboardLayoutCreateModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DashboardLayoutCreateModal: React.FC<DashboardLayoutCreateModalProps> = ({ onClose, ...props }) => {
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch();
  const context = React.useContext(ServiceContext);

  const [validated, setValidated] = React.useState<'default' | 'success' | 'warning' | 'error' | undefined>('default');
  const [name, setName] = React.useState<string>('');

  const handleNameChange = React.useCallback(
    (value: string) => {
      setName(value);
      if (value.length === 0) {
        setValidated('error');
      } else {
        addSubscription(
          context.settings.dashboardLayouts().subscribe((layouts) => {
            if (layouts.some((layout) => layout.name === value)) {
              setValidated('error');
            } else {
              setValidated('success');
            }
          })
        );
      }
    },
    [context.settings, setName, setValidated]
  );

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSubmit = React.useCallback(() => {
    const newLayout: DashboardConfigState = {
      name: name,
      list: [],
      _version: _dashboardConfigVersion,
    };
    context.settings.setDashboardLayouts(newLayout);
    dispatch(dashboardLayoutConfigReplaceCardIntent(name, []));
    onClose();
  }, [dispatch, onClose, name]);

  return (
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Create Dashboard Layout"
    >
      <Form>
        <FormGroup
          label="Name"
          fieldId="name"
          helperText="Enter a name for the new dashboard layout."
          helperTextInvalid="Name must be unique."
          isRequired
          validated={validated}
        >
          <TextInput
            isRequired
            type="text"
            id="name"
            name="name"
            aria-describedby="name-helper"
            value={name}
            onChange={handleNameChange}
          />
        </FormGroup>
        <ActionGroup>
          <Button variant="primary" onClick={handleSubmit} isDisabled={validated !== 'success'}>
            Submit
          </Button>
          <Button variant="link" onClick={handleClose}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
