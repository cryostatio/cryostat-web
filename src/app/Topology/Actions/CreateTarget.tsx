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

import openjdkSvg from '@app/assets/openjdk.svg';
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { Locations } from '@app/Settings/CredentialsStorage';
import { LinearDotSpinner } from '@app/Shared/LinearDotSpinner';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import { isHttpOk } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import '@app/Topology/styles/base.css';
import { getFromLocalStorage } from '@app/utils/LocalStorage';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  ActionGroup,
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  Flex,
  FlexItem,
  Form,
  FormAlert,
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  gridSpans,
  HelperText,
  HelperTextItem,
  TextInput,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, PendingIcon, SyncAltIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

export const isValidTargetConnectURL = (connectUrl?: string) => connectUrl && !connectUrl.match(/\s+/);

export interface CreateTargetProps {
  prefilled?: {
    connectUrl: string;
    alias?: string;
    username?: string;
    password?: string;
  };
}

export const CreateTarget: React.FC<CreateTargetProps> = ({ prefilled, ..._props }) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
  const history = useHistory();
  const [t] = useTranslation();

  const [example, setExample] = React.useState('');
  const [{ connectUrl, alias, validConnectUrl, username, password }, setFormData] = React.useState({
    connectUrl: '',
    alias: '',
    validConnectUrl: ValidatedOptions.default,
    username: '',
    password: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [validation, setValidation] = React.useState({
    option: ValidatedOptions.default,
    errorMessage: '',
  });
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]); // Array of ids

  const target = React.useMemo(() => ({ connectUrl, alias }), [connectUrl, alias]);

  const credentials = React.useMemo(() => ({ username, password }), [username, password]);

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'creating-custom-target',
        isLoading: loading,
      } as LoadingPropsType),
    [loading]
  );

  const toggleCredentialForm = React.useCallback(
    (toggleId: string) =>
      setExpandedSections((old) => {
        const matched = old.find((id) => id === toggleId);
        if (matched) {
          return old.filter((id) => id !== matched);
        } else {
          return [...old, toggleId];
        }
      }),
    [setExpandedSections]
  );

  const resetTestState = React.useCallback(
    () => setValidation({ option: ValidatedOptions.default, errorMessage: '' }),
    [setValidation]
  );

  const handleConnectUrlChange = React.useCallback(
    (connectUrl: string) => {
      setFormData((old) => ({
        ...old,
        connectUrl,
        validConnectUrl:
          connectUrl === ''
            ? ValidatedOptions.default
            : isValidTargetConnectURL(connectUrl)
            ? ValidatedOptions.success
            : ValidatedOptions.error,
      }));
      resetTestState();
    },
    [setFormData, resetTestState]
  );

  const handleAliasChange = React.useCallback(
    (alias: string) => {
      setFormData((old) => ({ ...old, alias }));
      resetTestState();
    },
    [setFormData, resetTestState]
  );

  const handleUsernameChange = React.useCallback(
    (username: string) => {
      setFormData((old) => ({ ...old, username }));
      resetTestState();
    },
    [setFormData, resetTestState]
  );

  const handlePasswordChange = React.useCallback(
    (password: string) => {
      setFormData((old) => ({ ...old, password }));
      resetTestState();
    },
    [setFormData, resetTestState]
  );

  const handleSubmit = React.useCallback(() => {
    setLoading(true);
    // Get storage location
    const locationKey = getFromLocalStorage('CREDENTIAL_LOCATION', Locations.BACKEND.key);
    addSubscription(
      context.api
        .createTarget(
          {
            connectUrl: connectUrl,
            alias: alias.trim() || connectUrl,
          },
          credentials,
          locationKey === Locations.BACKEND.key
        )
        .subscribe(({ status, body }) => {
          setLoading(false);
          const option = isHttpOk(status) ? ValidatedOptions.success : ValidatedOptions.error;
          if (option === ValidatedOptions.success) {
            history.push('/topology');
          } else {
            setValidation({
              option: option,
              errorMessage: body['data']['reason'],
            });
          }
        })
    );
  }, [setLoading, setValidation, addSubscription, context.api, connectUrl, alias, history, credentials]);

  const testTarget = React.useCallback(() => {
    if (!isValidTargetConnectURL(connectUrl)) {
      return;
    }
    addSubscription(
      context.api
        .createTarget(
          {
            connectUrl: connectUrl,
            alias: alias.trim() || connectUrl,
          },
          credentials,
          false,
          true
        )
        .subscribe(({ status, body }) => {
          setTesting(false);
          const option = isHttpOk(status) ? ValidatedOptions.success : ValidatedOptions.error;
          setValidation({
            option: option,
            errorMessage: option !== ValidatedOptions.success ? body['data']['reason'] : '',
          });
        })
    );
    setTesting(true);
    resetTestState();
  }, [connectUrl, alias, credentials, addSubscription, context.api, resetTestState, setTesting]);

  const handleCancel = React.useCallback(() => history.goBack(), [history]);

  React.useEffect(() => {
    if (prefilled) {
      const { connectUrl, alias, username, password } = prefilled;
      setFormData({
        connectUrl: connectUrl,
        alias: alias || '',
        validConnectUrl: isValidTargetConnectURL(connectUrl) ? ValidatedOptions.success : ValidatedOptions.error,
        username: username || '',
        password: password || '',
      });
    }
  }, [prefilled]);

  React.useEffect(() => {
    addSubscription(
      context.targets.targets().subscribe((ts) => {
        const discoveredTargets = ts.filter((t) => t.annotations?.cryostat['REALM'] !== 'Custom Targets');
        if (discoveredTargets.length) {
          setExample(discoveredTargets[0].connectUrl);
        }
      })
    );
  }, [addSubscription, context.targets, setExample]);

  const responsiveSpans = React.useMemo(
    () => [
      {
        xl2: 7 as gridSpans,
        xl: 7 as gridSpans,
        lg: 7 as gridSpans,
        md: 12 as gridSpans,
        sm: 12 as gridSpans,
      } as Record<'xl2' | 'xl' | 'lg' | 'md' | 'sm', gridSpans>,
      {
        xl2: 5 as gridSpans,
        xl: 5 as gridSpans,
        lg: 5 as gridSpans,
        md: 12 as gridSpans,
        sm: 12 as gridSpans,
      } as Record<'xl2' | 'xl' | 'lg' | 'md' | 'sm', gridSpans>,
    ],
    []
  );

  return (
    <BreadcrumbPage pageTitle={'Create Custom Target'} breadcrumbs={[{ title: 'Topology', path: '/topology' }]}>
      <Card isFullHeight>
        <CardTitle>Create Custom Target</CardTitle>
        <CardBody>
          <Form className="console-form-group">
            <Grid hasGutter>
              <GridItem {...responsiveSpans[0]} order={{ default: '0', lg: '0', xl: '0' }}>
                <FormAlert>
                  <Alert
                    variant="info"
                    title={
                      'Note: If the target requires authentication, use JMX Credential Options to provide credentials.'
                    }
                    aria-live="polite"
                    isInline
                  />
                </FormAlert>
                <FormGroup
                  label="Connection URL"
                  isRequired
                  fieldId="connect-url"
                  helperText={
                    <FormHelperText isHidden={false} component="div">
                      JMX Service URL.{' '}
                      {example && (
                        <>
                          For example,
                          <ClipboardCopy
                            hoverTip="Click to copy to clipboard"
                            clickTip="Copied!"
                            variant="inline-compact"
                          >
                            {example}
                          </ClipboardCopy>
                        </>
                      )}
                    </FormHelperText>
                  }
                  helperTextInvalid={'JMX Service URL must not contain empty spaces.'}
                  validated={validConnectUrl}
                >
                  <TextInput
                    aria-label={'Connection URL'}
                    value={connectUrl}
                    isRequired
                    type="text"
                    id="connect-url"
                    placeholder={example}
                    onChange={handleConnectUrlChange}
                    isDisabled={loading || testing}
                    validated={validConnectUrl}
                    data-quickstart-id="ct-connecturl-input"
                  />
                </FormGroup>
                <FormGroup
                  label="Alias"
                  fieldId="alias"
                  helperText={
                    <FormHelperText isHidden={false}>
                      Connection Nickname (same as Connection URL if not specified).
                    </FormHelperText>
                  }
                >
                  <TextInput
                    value={alias}
                    type="text"
                    id="alias"
                    onChange={handleAliasChange}
                    isDisabled={loading || testing}
                    data-quickstart-id="ct-alias-input"
                  />
                </FormGroup>
                <FormGroup>
                  <Accordion asDefinitionList={false} data-quickstart-id="ct-credential-expand">
                    <AccordionItem>
                      <AccordionToggle
                        className="expandable-form__accordion-toggle-block"
                        id={'jmx-credential-option'}
                        isExpanded={expandedSections.includes('jmx-credential-option')}
                        onClick={() => toggleCredentialForm('jmx-credential-option')}
                        type={'button'}
                      >
                        <span className="expandable-form__title">JMX Credential Options</span>
                      </AccordionToggle>
                      <div className="expandable-form__help-block " id={'jmx-credential-option-description'}>
                        Creates credentials that Cryostat uses to connect to target JVMs over JMX.
                      </div>
                      <AccordionContent
                        isHidden={!expandedSections.includes('jmx-credential-option')}
                        id={'expanded-jmx-credential-option'}
                      >
                        <FormGroup
                          label={'Username'}
                          fieldId="username"
                          className="expandable-form__form-group"
                          helperText={<FormHelperText isHidden={false}>Username for JMX connection.</FormHelperText>}
                        >
                          <TextInput
                            aria-label={'Username'}
                            value={username}
                            isRequired
                            type="text"
                            id="username"
                            onChange={handleUsernameChange}
                            isDisabled={loading || testing}
                            data-quickstart-id="ct-username-input"
                          />
                        </FormGroup>
                        <FormGroup
                          label={'Password'}
                          fieldId="password"
                          className="expandable-form__form-group"
                          helperText={<FormHelperText isHidden={false}>Password for JMX connection.</FormHelperText>}
                        >
                          <TextInput
                            value={password}
                            isDisabled={loading || testing}
                            isRequired
                            type="password"
                            id="password"
                            onChange={handlePasswordChange}
                            data-quickstart-id="ct-password-input"
                          />
                        </FormGroup>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </FormGroup>
              </GridItem>
              <GridItem {...responsiveSpans[1]} order={{ default: '1', lg: '1', xl: '1', md: '1' }}>
                <SampleNodeDonut target={target} validation={validation} testing={loading} onClick={testTarget} />
              </GridItem>
            </Grid>
            <ActionGroup>
              <Button
                variant="primary"
                isDisabled={!connectUrl || validConnectUrl !== ValidatedOptions.success || loading}
                onClick={handleSubmit}
                {...createButtonLoadingProps}
                data-quickstart-id="ct-create-btn"
              >
                {loading ? t('CREATING', { ns: 'common' }) : t('CREATE', { ns: 'common' })}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                {t('CANCEL', { ns: 'common' })}
              </Button>
            </ActionGroup>
          </Form>
        </CardBody>
      </Card>
      <></>
    </BreadcrumbPage>
  );
};

export interface SampleNodeDonutProps {
  target: Target;
  testing?: boolean;
  validation: {
    option: ValidatedOptions;
    errorMessage: string;
  };
  onClick?: () => void;
  className?: string;
}

export const SampleNodeDonut: React.FC<SampleNodeDonutProps> = ({
  target,
  className,
  testing,
  validation,
  onClick,
}) => {
  const _transformedTarget = React.useMemo(
    () => ({ connectUrl: target.connectUrl, alias: target.alias.trim() || target.connectUrl }),
    [target]
  );

  const _actionEnabled = React.useMemo(() => isValidTargetConnectURL(target.connectUrl), [target]);

  const statusIcon = React.useMemo(() => {
    if (testing) {
      return { icon: <SyncAltIcon />, message: 'Testing custom target definition.' };
    }
    return validation.option === ValidatedOptions.success
      ? {
          icon: <CheckCircleIcon color="var(--pf-global--success-color--100)" />,
          message: 'Target definition is valid.',
        }
      : validation.option === ValidatedOptions.error
      ? {
          icon: <ExclamationCircleIcon color="var(--pf-global--danger-color--100)" />,
          message: validation.errorMessage,
        }
      : { icon: <PendingIcon />, message: '' };
  }, [validation, testing]);

  return (
    <>
      {validation.option === ValidatedOptions.error && (
        <FormAlert>
          <Alert aria-live="polite" isInline title={validation.errorMessage} variant="danger">
            {'Please check if the Connection URL is valid. Provide any credentials if needed.'}
          </Alert>
        </FormAlert>
      )}
      <Flex className={css(className)} direction={{ default: 'column' }}>
        <Flex
          alignSelf={{ default: 'alignSelfCenter' }}
          direction={{ default: 'column' }}
          data-quickstart-id="ct-sample-testnode"
        >
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <Tooltip
              appendTo={portalRoot}
              content={
                _actionEnabled
                  ? `Click to test${validation.option !== ValidatedOptions.default ? ' again' : ''}.`
                  : 'Please provide a valid Connection URL.'
              }
            >
              <div
                className={css('sample-node-donut__node-wrapper', `${_actionEnabled ? 'active' : ''}`)}
                onClick={_actionEnabled ? onClick : undefined}
                data-quickstart-id="ct-sample-testnode-icon"
              >
                <div
                  className={css(
                    'sample-node-donut__node-icon',
                    validation.option !== ValidatedOptions.default ? validation.option : ''
                  )}
                >
                  <Bullseye>{testing ? <LinearDotSpinner /> : <img src={openjdkSvg} alt="Cryostat Logo" />}</Bullseye>
                </div>
                <div className={'sample-node-donut__status-indicator'}>{statusIcon.icon}</div>
              </div>
            </Tooltip>
          </FlexItem>
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <div className={css('sample-node-donut__node-label')}>
              <Tooltip content={'Custom Target'} appendTo={portalRoot}>
                <span className="sample-node-donut__node-label-badge">{'CT'}</span>
              </Tooltip>
              {_transformedTarget.alias || '<Name>'}
            </div>
          </FlexItem>
        </Flex>
        <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
          <HelperText>
            <HelperTextItem>Click on the sample node above to test custom target definition.</HelperTextItem>
          </HelperText>
        </FlexItem>
      </Flex>
    </>
  );
};

export default CreateTarget;
