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
import { CEL_SPEC_HREF } from '@app/Rules/utils';
import { MatchExpressionHint } from '@app/Shared/Components/MatchExpression/MatchExpressionHint';
import { MatchExpressionVisualizer } from '@app/Shared/Components/MatchExpression/MatchExpressionVisualizer';
import { Target } from '@app/Shared/Services/api.types';
import { MatchExpressionService } from '@app/Shared/Services/MatchExpression.service';
import { SearchExprServiceContext } from '@app/Shared/Services/service.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useMatchExpressionSvc } from '@app/utils/hooks/useMatchExpressionSvc';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot, StreamOf } from '@app/utils/utils';
import {
  Button,
  Card,
  CardBody,
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
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
import { Trans, useTranslation } from 'react-i18next';
import { catchError, combineLatest, distinctUntilChanged, interval, map, of, switchMap, tap } from 'rxjs';
import { CredentialTestTable } from './CredentialTestTable';
import { TestRequest } from './types';
import { CredentialContext, TestPoolContext, useAuthCredential } from './utils';

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
  const { t } = useTranslation();
  const matchExpreRef = React.useRef(new MatchExpressionService());
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
      isOpen={visible}
      tabIndex={0} // enable keyboard-accessible scrolling
      variant={ModalVariant.large}
      showClose={!inProgress}
      className="add-credential-modal"
      onClose={onDismiss}
      title={t('CreateCredentialModal.MODAL_TITLE')}
      description={t('CreateCredentialModal.MODAL_DESCRIPTION')}
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
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const matchExprService = useMatchExpressionSvc();
  const [matchExpressionInput, setMatchExpressionInput] = React.useState('');
  const [matchExpressionValid, setMatchExpressionValid] = React.useState(ValidatedOptions.default);
  const [_, setCredential] = useAuthCredential(true);
  const testPool = React.useContext(TestPoolContext);
  const [saving, setSaving] = React.useState(false);
  const [isDisabled, setIsDisabled] = React.useState(false);
  const [evaluating, setEvaluating] = React.useState(false);

  const [sampleTarget, setSampleTarget] = React.useState<Target | undefined>();

  const onSave = React.useCallback(
    (username: string, password: string) => {
      setSaving(true);
      addSubscription(
        context.api.postCredentials(matchExpressionInput, username, password).subscribe((ok) => {
          setSaving(false);
          if (ok) {
            onPropsSave();
          }
        }),
      );
    },
    [addSubscription, onPropsSave, context.api, matchExpressionInput, setSaving],
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
        context.targets.targets().pipe(tap((ts) => (ts && ts.length > 0 ? setSampleTarget(ts[0]) : undefined))),
      ])
        .pipe(
          switchMap(([input, targets]) =>
            input
              ? context.api.matchTargetsWithExpr(input, targets).pipe(
                  map((ts) => [ts, undefined]),
                  catchError((err) => of([[], err])),
                )
              : of([undefined, undefined]),
          ),
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
              : ValidatedOptions.warning,
          );
        }),
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
          distinctUntilChanged(),
        )
        .subscribe(setIsDisabled),
    );
  }, [testPool, setIsDisabled, addSubscription]);

  return (
    <CredentialAuthForm
      {...props}
      onSave={onSave}
      onDismiss={onDismiss}
      loading={saving}
      isDisabled={isDisabled}
      onCredentialChange={setCredential}
    >
      <FormGroup
        label={t('MATCH_EXPRESSION', { ns: 'common' })}
        labelIcon={
          <Popover
            appendTo={portalRoot}
            headerContent={t('CreateCredentialModal.MATCH_EXPRESSION_HINT_MODAL_HEADER')}
            bodyContent={
              <>
                {t('CreateCredentialModal.MATCH_EXPRESSION_HINT_BODY')}
                <MatchExpressionHint target={sampleTarget} />
              </>
            }
            hasAutoWidth
          >
            <Button variant="plain" aria-label={t('CreateCredentialModal.ARIA_LABELS.HELPER_ICON')}>
              <HelpIcon />
            </Button>
          </Popover>
        }
        isRequired
        fieldId="match-expression"
      >
        <TextArea
          value={matchExpressionInput}
          isDisabled={isDisabled}
          isRequired
          type="text"
          id="matchexpr"
          aria-describedby="matchexpr-helper"
          onChange={(_event, v) => {
            setMatchExpressionInput(v);
            matchExprService.setSearchExpression(v);
          }}
          validated={matchExpressionValid}
          autoFocus
          autoResize
          resizeOrientation="vertical"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={matchExpressionValid}>
              {evaluating ? (
                t('CreateCredentialModal.EVALUATING_EXPRESSION')
              ) : matchExpressionValid === ValidatedOptions.warning ? (
                t('CreateCredentialModal.WARNING_NO_MATCH')
              ) : matchExpressionValid === ValidatedOptions.error ? (
                t('CreateCredentialModal.FAILING_EVALUATION')
              ) : (
                <Trans t={t} components={{ a: <a target="_blank" href={CEL_SPEC_HREF} /> }}>
                  CreateRule.MATCH_EXPRESSION_HELPER_TEXT
                </Trans>
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </CredentialAuthForm>
  );
};

type _SupportedTab = 'visualizer' | 'test';

export const FormHelper: React.FC = ({ ...props }) => {
  const { t } = useTranslation();
  const alertOptions = React.useMemo(() => ({ hideActions: true }), []);
  const [activeTab, setActiveTab] = React.useState<_SupportedTab>('visualizer');

  const handleTabChange = React.useCallback(
    (_: React.MouseEvent, key: string | number) => setActiveTab(`${key}` as _SupportedTab),
    [setActiveTab],
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
            <TabTitleText>{t('CreateCredentialModal.VISUALIZER')}</TabTitleText>
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
            <TabTitleText>{t('TEST', { ns: 'common' })}</TabTitleText>
          </>
        }
      >
        <CredentialTestTable />
      </Tab>
    </Tabs>
  );
};
