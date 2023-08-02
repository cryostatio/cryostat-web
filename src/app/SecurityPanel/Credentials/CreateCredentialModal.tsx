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
import { AuthCredential, CredentialAuthForm } from '@app/AppLayout/CredentialAuthForm';
import { MatchExpressionHint } from '@app/Shared/MatchExpression/MatchExpressionHint';
import { MatchExpressionVisualizer } from '@app/Shared/MatchExpression/MatchExpressionVisualizer';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { SearchExprService, SearchExprServiceContext, useExprSvc } from '@app/Topology/Shared/utils';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot, StreamOf } from '@app/utils/utils';
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
  Tab,
  Tabs,
  TabTitleIcon,
  TabTitleText,
  TextArea,
  ValidatedOptions,
} from '@patternfly/react-core';
import { FlaskIcon, HelpIcon, TopologyIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { catchError, combineLatest, distinctUntilChanged, interval, map, of, switchMap, tap } from 'rxjs';
import { CredentialTestTable } from './CredentialTestTable';
import { CredentialContext, TestPoolContext, TestRequest, useAuthCredential } from './utils';

export interface CreateCredentialModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPropsSave: () => void;
}

export const CreateCredentialModal: React.FC<CreateCredentialModalProps> = ({
  visible,
  onDismiss,
  onPropsSave,
  ...props
}) => {
  const matchExpreRef = React.useRef(new SearchExprService());
  const loadingRef = React.useRef(new StreamOf(false));
  const credentialRef = React.useRef(new StreamOf<AuthCredential>({ username: '', password: '' }));
  const testPoolRef = React.useRef(new Set<TestRequest>());
  const addSubscription = useSubscriptions();

  const [inProgress, setInProgress] = React.useState(false);

  React.useEffect(() => {
    addSubscription(loadingRef.current.get().subscribe(setInProgress));
  }, [addSubscription, loadingRef, setInProgress]);

  return (
    <Modal
      appendTo={portalRoot}
      isOpen={visible}
      tabIndex={0} // enable keyboard-accessible scrolling
      variant={ModalVariant.large}
      showClose={!inProgress}
      className="add-credential-modal"
      onClose={onDismiss}
      title="Store Credentials"
      description="Create stored credentials for target JVMs. Cryostat will use these credentials to connect to Cryostat agents or target JVMs over JMX (if required)."
    >
      <SearchExprServiceContext.Provider value={matchExpreRef.current}>
        <CredentialContext.Provider value={credentialRef.current}>
          <TestPoolContext.Provider value={testPoolRef.current}>
            <Grid hasGutter style={{ height: '100%' }}>
              <GridItem xl={4}>
                <Card isFullHeight isFlat>
                  <CardBody className="overflow-auto">
                    <AuthForm
                      {...props}
                      onDismiss={onDismiss}
                      onPropsSave={onPropsSave}
                      progressChange={setInProgress}
                    />
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem xl={8}>
                <Card isFullHeight isFlat>
                  <CardBody className="overflow-auto">
                    <FormHelper />
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </TestPoolContext.Provider>
        </CredentialContext.Provider>
      </SearchExprServiceContext.Provider>
    </Modal>
  );
};

interface AuthFormProps extends Omit<CreateCredentialModalProps, 'visible'> {
  progressChange?: (inProgress: boolean) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onDismiss, onPropsSave, progressChange, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const matchExprService = useExprSvc();
  const [matchExpressionInput, setMatchExpressionInput] = React.useState('');
  const [matchExpressionValid, setMatchExpressionValid] = React.useState(ValidatedOptions.default);
  const [_, setCredential] = useAuthCredential(true);
  const testPool = React.useContext(TestPoolContext);
  const [saving, setSaving] = React.useState(false);
  const [isDisabled, setIsDisabled] = React.useState(false);
  const [evaluating, setEvaluating] = React.useState(false);

  const [sampleTarget, setSampleTarget] = React.useState<Target>();

  const onSave = React.useCallback(
    (username: string, password: string) => {
      setSaving(true);
      addSubscription(
        context.api.postCredentials(matchExpressionInput, username, password).subscribe((ok) => {
          setSaving(false);
          if (ok) {
            onPropsSave();
          }
        })
      );
    },
    [addSubscription, onPropsSave, context.api, matchExpressionInput, setSaving]
  );

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        matchExprService.searchExpression({
          immediateFn: (_) => {
            setEvaluating(true);
            setMatchExpressionValid(ValidatedOptions.default);
          },
        }),
        context.targets.targets().pipe(tap((ts) => setSampleTarget(ts[0]))),
      ])
        .pipe(
          switchMap(([input, targets]) =>
            input
              ? context.api.matchTargetsWithExpr(input, targets).pipe(
                  map((ts) => [ts, undefined]),
                  catchError((err) => of([[], err]))
                )
              : of([undefined, undefined])
          )
        )
        .subscribe(([ts, err]) => {
          setEvaluating(false);
          setMatchExpressionValid(
            err
              ? ValidatedOptions.error
              : !ts
              ? ValidatedOptions.default
              : ts.length
              ? ValidatedOptions.success
              : ValidatedOptions.warning
          );
        })
    );
  }, [
    matchExprService,
    context.api,
    context.targets,
    setSampleTarget,
    setMatchExpressionValid,
    setEvaluating,
    addSubscription,
  ]);

  React.useEffect(() => {
    progressChange && progressChange(saving);
  }, [saving, progressChange]);

  React.useEffect(() => {
    // Polling test pool
    // 16ms gap or 60fps is smooth but not too fast.
    addSubscription(
      interval(16)
        .pipe(
          map(() => testPool.size > 0),
          distinctUntilChanged()
        )
        .subscribe(setIsDisabled)
    );
  }, [testPool, setIsDisabled, addSubscription]);

  return (
    <CredentialAuthForm
      {...props}
      onSave={onSave}
      onDismiss={onDismiss}
      focus={false}
      loading={saving}
      isDisabled={isDisabled}
      onCredentialChange={setCredential}
    >
      <FormGroup
        label="Match Expression"
        labelIcon={
          <Popover
            appendTo={portalRoot}
            headerContent="Match Expression Hint"
            bodyContent={
              <>
                Try an expression like:
                <MatchExpressionHint target={sampleTarget} />
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
          evaluating
            ? 'Evaluating match expression...'
            : matchExpressionValid === ValidatedOptions.warning
            ? `Warning: Match expression matches no targets.`
            : `
        Enter a match expression. This is a Java-like code snippet that is evaluated against each target
        application to determine whether the rule should be applied.`
        }
        helperTextInvalid="The expression matching failed."
        validated={matchExpressionValid}
      >
        <TextArea
          value={matchExpressionInput}
          isDisabled={isDisabled}
          isRequired
          type="text"
          id="rule-matchexpr"
          aria-describedby="rule-matchexpr-helper"
          onChange={(v) => {
            setMatchExpressionInput(v);
            matchExprService.setSearchExpression(v);
          }}
          validated={matchExpressionValid}
          autoFocus
          autoResize
          resizeOrientation="vertical"
        />
      </FormGroup>
    </CredentialAuthForm>
  );
};

type _SupportedTab = 'visualizer' | 'test';

export const FormHelper: React.FC = ({ ...props }) => {
  const alertOptions = React.useMemo(() => ({ hideActions: true }), []);
  const [activeTab, setActiveTab] = React.useState<_SupportedTab>('visualizer');

  const handleTabChange = React.useCallback(
    (_: React.MouseEvent, key: string | number) => setActiveTab(`${key}` as _SupportedTab),
    [setActiveTab]
  );

  return (
    <Tabs {...props} activeKey={activeTab} onSelect={handleTabChange}>
      <Tab
        eventKey={'visualizer'}
        title={
          <>
            <TabTitleIcon>
              <TopologyIcon />
            </TabTitleIcon>
            <TabTitleText>Visualizer</TabTitleText>
          </>
        }
      >
        <div style={{ marginTop: '1em', height: '100%' }}>
          <MatchExpressionVisualizer alertOptions={alertOptions} />
        </div>
      </Tab>
      <Tab
        eventKey={'test'}
        title={
          <>
            <TabTitleIcon>
              <FlaskIcon />
            </TabTitleIcon>
            <TabTitleText>Test</TabTitleText>
          </>
        }
      >
        <CredentialTestTable />
      </Tab>
    </Tabs>
  );
};
