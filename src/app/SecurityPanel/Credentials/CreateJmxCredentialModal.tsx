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
import { JmxAuthForm } from '@app/AppLayout/JmxAuthForm';
import { MatchExpressionEvaluator } from '@app/Shared/MatchExpressionEvaluator';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NO_TARGET } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  FormGroup,
  Modal,
  ModalVariant,
  Text,
  TextInput,
  TextVariants,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';

export interface CreateJmxCredentialModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPropsSave: () => void;
}

export const CreateJmxCredentialModal: React.FunctionComponent<CreateJmxCredentialModalProps> = ({
  visible,
  onDismiss,
  onPropsSave,
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [matchExpression, setMatchExpression] = React.useState('');
  const [matchExpressionValid, setMatchExpressionValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);
  const [target, setTarget] = React.useState(NO_TARGET);

  const onSave = React.useCallback(
    (username: string, password: string) => {
      setLoading(true);
      addSubscription(
        context.api.postCredentials(matchExpression, username, password).subscribe((ok) => {
          setLoading(false);
          if (ok) {
            onPropsSave();
          }
        })
      );
    },
    [addSubscription, onPropsSave, context.api, matchExpression, setLoading]
  );

  return (
    <Modal
      isOpen={visible}
      variant={ModalVariant.large}
      showClose={!loading}
      onClose={onDismiss}
      title="Store JMX Credentials"
      description="Creates stored credentials for target JVMs according to various properties.
        If a Target JVM requires JMX authentication, Cryostat will use stored credentials
        when attempting to open JMX connections to the target."
    >
      <JmxAuthForm onSave={onSave} onDismiss={onDismiss} focus={false} loading={loading}>
        <MatchExpressionEvaluator
          matchExpression={matchExpression}
          onChange={setMatchExpressionValid}
          onTargetChange={setTarget}
        />
        <FormGroup
          label="Match Expression"
          isRequired
          fieldId="match-expression"
          helperText={
            <Text component={TextVariants.small}>
              Enter a match expression. This is a Java-like code snippet that is evaluated against each target
              application to determine whether the rule should be applied. Select a target from the dropdown below to
              view the context object available within the match expression context and test if the expression matches.
            </Text>
          }
          validated={matchExpressionValid}
        >
          <TextInput
            value={matchExpression}
            isDisabled={loading}
            isRequired
            type="text"
            id="rule-matchexpr"
            aria-describedby="rule-matchexpr-helper"
            placeholder={target === NO_TARGET ? undefined : `target.connectUrl == '${target.connectUrl}'`}
            onChange={setMatchExpression}
            validated={matchExpressionValid}
            autoFocus
          />
        </FormGroup>
      </JmxAuthForm>
    </Modal>
  );
};
