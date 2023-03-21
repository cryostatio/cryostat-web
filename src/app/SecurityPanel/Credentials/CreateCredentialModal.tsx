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
import { MatchExpressionHint } from '@app/Shared/MatchExpression/MatchExpressionHint';
import { MatchExpressionVisualizer } from '@app/Shared/MatchExpression/MatchExpressionVisualizer';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { SearchExprService, SearchExprServiceContext } from '@app/Topology/Shared/utils';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { evaluateTargetWithExpr, portalRoot } from '@app/utils/utils';
import {
  Button,
  Card,
  CardBody,
  FormGroup,
  Grid,
  GridItem,
  Modal,
  ModalVariant,
  Popover,
  TextArea,
  ValidatedOptions,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import * as React from 'react';

export interface CreateCredentialModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPropsSave: () => void;
}

export const CreateCredentialModal: React.FunctionComponent<CreateCredentialModalProps> = ({
  visible,
  onDismiss,
  onPropsSave,
  ...props
}) => {
  const matchExpreRef = React.useRef(new SearchExprService());
  const [inProgress, setInProgress] = React.useState(false);

  return (
    <SearchExprServiceContext.Provider value={matchExpreRef.current}>
      <Modal
        appendTo={portalRoot}
        isOpen={visible}
        tabIndex={0} // enable keyboard-accessible scrolling
        variant={ModalVariant.large}
        showClose={!inProgress}
        className="add-credential-modal"
        onClose={onDismiss}
        title="Store Credentials"
        description="Creates stored credentials for target JVMs according to various properties.
        If a Target JVM requires JMX authentication, Cryostat will use stored credentials
        when attempting to open JMX connections to the target."
      >
        <Grid hasGutter style={{ height: '100%' }}>
          <GridItem xl={4}>
            <Card isFullHeight isFlat>
              <CardBody style={{ overflow: 'auto' }}>
                <AuthForm
                  visible={visible}
                  onDismiss={onDismiss}
                  onPropsSave={onPropsSave}
                  progressChange={setInProgress}
                  {...props}
                />
              </CardBody>
            </Card>
          </GridItem>
          <GridItem xl={8}>
            <Card isFullHeight isFlat>
              <CardBody style={{ overflow: 'auto' }}>
                <MatchExpressionVisualizer />
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </Modal>
    </SearchExprServiceContext.Provider>
  );
};

interface AuthFormProps extends CreateCredentialModalProps {
  progressChange?: (inProgress: boolean) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onDismiss, onPropsSave, progressChange, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const matchExprService = React.useContext(SearchExprServiceContext);
  const [matchExpression, setMatchExpression] = React.useState('');
  const [matchExpressionValid, setMatchExpressionValid] = React.useState(ValidatedOptions.default);
  const [loading, setLoading] = React.useState(false);

  const [targets, setTargets] = React.useState<Target[]>([]);

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

  React.useEffect(() => {
    progressChange && progressChange(loading);
  }, [loading, progressChange]);

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  React.useEffect(() => {
    let validation: ValidatedOptions = ValidatedOptions.default;
    if (matchExpression !== '' && targets.length > 0) {
      try {
        const atLeastOne = targets.some((t) => evaluateTargetWithExpr(t, matchExpression));
        validation = atLeastOne ? ValidatedOptions.success : ValidatedOptions.warning;
      } catch (err) {
        validation = ValidatedOptions.error;
      }
    }
    setMatchExpressionValid(validation);
  }, [matchExpression, targets, setMatchExpressionValid]);

  return (
    <JmxAuthForm {...props} onSave={onSave} onDismiss={onDismiss} focus={false} loading={loading}>
      <FormGroup
        label="Match Expression"
        labelIcon={
          <Popover
            headerContent="Match Expression Hint"
            bodyContent={
              <>
                Try an expression like:
                <MatchExpressionHint target={targets[0]} />
              </>
            }
            hasAutoWidth
          >
            <Button
              variant="plain"
              aria-label="More info for match expression field"
              onClick={(e) => e.preventDefault()}
              className="pf-c-form__group-label-help"
            >
              <HelpIcon />
            </Button>
          </Popover>
        }
        isRequired
        fieldId="match-expression"
        helperText={
          matchExpressionValid === ValidatedOptions.warning
            ? `Warning: Match expression matches no targets.`
            : `
        Enter a match expression. This is a Java-like code snippet that is evaluated against each target
        application to determine whether the rule should be applied. Select a target from the dropdown
        on the right to view the context object available within the match expression context and test
        if the expression matches.`
        }
        helperTextInvalid="Invalid Match Expression."
        validated={matchExpressionValid}
      >
        <TextArea
          value={matchExpression}
          isDisabled={loading}
          isRequired
          type="text"
          id="rule-matchexpr"
          aria-describedby="rule-matchexpr-helper"
          onChange={(v) => {
            setMatchExpression(v);
            matchExprService.setSearchExpression(v);
          }}
          validated={matchExpressionValid}
          autoFocus
          autoResize
          resizeOrientation="vertical"
        />
      </FormGroup>
    </JmxAuthForm>
  );
};
