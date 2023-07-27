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
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Modal, ModalVariant, Text } from '@patternfly/react-core';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Observable, filter, first, map, mergeMap } from 'rxjs';
import { CredentialAuthForm } from './CredentialAuthForm';

export interface AuthModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: () => void;
  targetObs: Observable<Target>;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onDismiss, onSave: onPropsSave, targetObs, ...props }) => {
  const context = React.useContext(ServiceContext);
  const [loading, setLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const onSave = React.useCallback(
    (username: string, password: string) => {
      setLoading(true);
      addSubscription(
        targetObs
          .pipe(
            filter((target) => target !== NO_TARGET),
            first(),
            map((target) => target.connectUrl),
            mergeMap((connectUrl) => context.authCredentials.setCredential(connectUrl, username, password))
          )
          .subscribe((ok) => {
            setLoading(false);
            if (ok) {
              onPropsSave();
            }
          })
      );
    },
    [addSubscription, context.authCredentials, targetObs, setLoading, onPropsSave]
  );

  return (
    <Modal
      isOpen={props.visible}
      variant={ModalVariant.large}
      showClose={!loading}
      onClose={onDismiss}
      title="Authentication Required"
      description={
        <Text>
          This target JVM requires authentication. The credentials you provide here will be passed from Cryostat to the
          target when establishing JMX connections. Enter credentials specific to this target, or go to{' '}
          <Link onClick={onDismiss} to="/security">
            Security
          </Link>{' '}
          to add a credential matching multiple targets. Visit{' '}
          <Link onClick={onDismiss} to="/settings">
            Settings
          </Link>{' '}
          to confirm and configure whether these credentials will be held only for this browser session or stored
          encrypted in the Cryostat backend.
        </Text>
      }
    >
      <CredentialAuthForm onSave={onSave} onDismiss={onDismiss} focus={true} loading={loading} />
    </Modal>
  );
};
