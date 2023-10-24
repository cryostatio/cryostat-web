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
import { ErrorView } from '@app/ErrorView/ErrorView';
import { authFailMessage, isAuthFail, missingSSLMessage } from '@app/ErrorView/types';
import { LoadingProps } from '@app/Shared/Components/types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { ActionGroup, Button, Form, Text, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { first } from 'rxjs';

export interface SnapshotRecordingFormProps {}

export const SnapshotRecordingForm: React.FC<SnapshotRecordingFormProps> = (_) => {
  const navigate = useNavigate();
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const exitForm = React.useCallback(() => navigate('..', { relative: 'path' }), [navigate]);

  const handleCreateSnapshot = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.api
        .createSnapshot()
        .pipe(first())
        .subscribe((success) => {
          setLoading(false);
          if (success) {
            exitForm();
          }
        }),
    );
  }, [addSubscription, context.api, exitForm, setLoading]);

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'create-snapshot-recording',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  React.useEffect(() => {
    addSubscription(
      context.target.sslFailure().subscribe(() => {
        // also triggered if api calls in Custom Recording form fail
        setErrorMessage(missingSSLMessage);
      }),
    );
  }, [context.target, setErrorMessage, addSubscription]);

  React.useEffect(() => {
    addSubscription(
      context.target.authRetry().subscribe(() => {
        setErrorMessage(''); // Reset on retry
      }),
    );
  }, [context.target, setErrorMessage, addSubscription]);

  React.useEffect(() => {
    addSubscription(
      context.target.authFailure().subscribe(() => {
        // also triggered if api calls in Custom Recording form fail
        setErrorMessage(authFailMessage);
      }),
    );
  }, [context.target, setErrorMessage, addSubscription]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(() => {
        setErrorMessage(''); // Reset on change
      }),
    );
  }, [context.target, setErrorMessage, addSubscription]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error displaying recording creation form'}
        message={errorMessage}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  }
  return (
    <>
      <Form isHorizontal>
        <Text component={TextVariants.p}>
          A Snapshot recording is one which contains all information about all events that have been captured in the
          current session by <i>other,&nbsp; non-Snapshot</i> recordings. Snapshots do not themselves define which
          events are enabled, their thresholds, or any other options. A Snapshot is only ever in the STOPPED state from
          the moment it is created.
        </Text>
        <ActionGroup>
          <Button variant="primary" onClick={handleCreateSnapshot} isDisabled={loading} {...createButtonLoadingProps}>
            {loading ? 'Creating' : 'Create'}
          </Button>
          <Button variant="secondary" onClick={exitForm} isDisabled={loading}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </>
  );
};
