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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { BreadcrumbTrail } from '@app/BreadcrumbPage/types';
import { EventTemplateIdentifier } from '@app/CreateRecording/types';
import { MatchExpressionHint } from '@app/Shared/Components/MatchExpression/MatchExpressionHint';
import { MatchExpressionVisualizer } from '@app/Shared/Components/MatchExpression/MatchExpressionVisualizer';
import { SelectTemplateSelectorForm } from '@app/Shared/Components/SelectTemplateSelectorForm';
import { LoadingProps } from '@app/Shared/Components/types';
import { EventTemplate, Target, Rule } from '@app/Shared/Services/api.types';
import { MatchExpressionService } from '@app/Shared/Services/MatchExpression.service';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { SearchExprServiceContext } from '@app/Shared/Services/service.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useMatchExpressionSvc } from '@app/utils/hooks/useMatchExpressionSvc';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Popover,
  Split,
  SplitItem,
  Switch,
  Text,
  TextArea,
  TextInput,
  TextVariants,
  ValidatedOptions,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { combineLatest, forkJoin, iif, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { RuleFormData } from './types';
import { CEL_SPEC_HREF, isRuleNameValid } from './utils';

export interface CreateRuleFormProps {}

export const CreateRuleForm: React.FC<CreateRuleFormProps> = (_props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Do not use useSearchExpression for display. This causes the cursor to jump to the end due to async updates.
  const matchExprService = useMatchExpressionSvc();
  const addSubscription = useSubscriptions();

  const [formData, setFormData] = React.useState<RuleFormData>({
    name: '',
    nameValid: ValidatedOptions.default,
    enabled: true,
    description: '',
    matchExpression: '', // Use this for displaying Match Expression input
    matchExpressionValid: ValidatedOptions.default,
    maxAge: 0,
    maxAgeUnit: 1,
    maxSize: 0,
    maxSizeUnit: 1,
    archivalPeriod: 0,
    archivalPeriodUnit: 1,
    initialDelay: 0,
    initialDelayUnit: 1,
    preservedArchives: 0,
  });
  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [evaluating, setEvaluating] = React.useState(false);
  const [sampleTarget, setSampleTarget] = React.useState<Target>();

  const matchedTargetsRef = React.useRef(new Subject<Target[]>());

  const eventSpecifierString = React.useMemo(() => {
    let str = '';
    const { template } = formData;
    if (template && template.name) {
      str += `template=${template.name}`;
    }
    if (template && template.type) {
      str += `,type=${template.type}`;
    }
    return str;
  }, [formData]);

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'creating-automated-rule',
        isLoading: loading,
      }) as LoadingProps,
    [loading],
  );

  const selectedSpecifier = React.useMemo(() => {
    const { template } = formData;
    if (template && template.name && template.type) {
      return `${template.name},${template.type}`;
    }
    return '';
  }, [formData]);

  const handleNameChange = React.useCallback(
    (_, name: string) =>
      setFormData((old) => ({
        ...old,
        name,
        nameValid: !name
          ? ValidatedOptions.default
          : isRuleNameValid(name)
            ? ValidatedOptions.success
            : ValidatedOptions.error,
      })),
    [setFormData],
  );

  const handleDescriptionChange = React.useCallback(
    (_, description: string) => setFormData((old) => ({ ...old, description })),
    [setFormData],
  );

  const handleMatchExpressionChange = React.useCallback(
    (_, matchExpression: string) => {
      matchExprService.setSearchExpression(matchExpression);
      setFormData((old) => ({ ...old, matchExpression }));
    },
    [setFormData, matchExprService],
  );

  const handleTemplateChange = React.useCallback(
    (template: EventTemplateIdentifier) => setFormData((old) => ({ ...old, template })),
    [setFormData],
  );

  const handleEnabledChange = React.useCallback(
    (_, enabled: boolean) => setFormData((old) => ({ ...old, enabled })),
    [setFormData],
  );

  const handleMaxAgeChange = React.useCallback(
    (_, maxAge: string) => setFormData((old) => ({ ...old, maxAge: Number(maxAge) })),
    [setFormData],
  );

  const handleMaxAgeUnitChange = React.useCallback(
    (_, maxAgeUnit: string) => setFormData((old) => ({ ...old, maxAgeUnit: Number(maxAgeUnit) })),
    [setFormData],
  );

  const handleMaxSizeChange = React.useCallback(
    (_, maxSize: string) => setFormData((old) => ({ ...old, maxSize: Number(maxSize) })),
    [setFormData],
  );

  const handleMaxSizeUnitChange = React.useCallback(
    (_, maxSizeUnit: string) => setFormData((old) => ({ ...old, maxSizeUnit: Number(maxSizeUnit) })),
    [setFormData],
  );

  const handleArchivalPeriodChange = React.useCallback(
    (_, archivalPeriod: string) => setFormData((old) => ({ ...old, archivalPeriod: Number(archivalPeriod) })),
    [setFormData],
  );

  const handleArchivalPeriodUnitsChange = React.useCallback(
    (_, archivalPeriodUnit: string) =>
      setFormData((old) => ({ ...old, archivalPeriodUnit: Number(archivalPeriodUnit) })),
    [setFormData],
  );

  const handleInitialDelayChange = React.useCallback(
    (_, initialDelay: string) => setFormData((old) => ({ ...old, initialDelay: Number(initialDelay) })),
    [setFormData],
  );

  const handleInitialDelayUnitsChanged = React.useCallback(
    (_, initialDelayUnit: string) => setFormData((old) => ({ ...old, initialDelayUnit: Number(initialDelayUnit) })),
    [setFormData],
  );

  const handlePreservedArchivesChange = React.useCallback(
    (_, preservedArchives: string) => setFormData((old) => ({ ...old, preservedArchives: Number(preservedArchives) })),
    [setFormData],
  );

  const exitForm = React.useCallback(() => navigate('..', { relative: 'path' }), [navigate]);

  const handleSubmit = React.useCallback((): void => {
    const notificationMessages: string[] = [];
    const {
      name,
      nameValid,
      description,
      enabled,
      matchExpression,
      preservedArchives,
      archivalPeriod,
      archivalPeriodUnit,
      initialDelay,
      initialDelayUnit,
      maxAge,
      maxAgeUnit,
      maxSize,
      maxSizeUnit,
    } = formData;
    if (nameValid !== ValidatedOptions.success) {
      notificationMessages.push(`Rule name ${name} is invalid`);
    }
    if (notificationMessages.length > 0) {
      const message = notificationMessages.join('. ').trim() + '.';
      notifications.warning('Invalid form data', message);
      return;
    }
    const rule: Rule = {
      name,
      description,
      enabled,
      matchExpression: matchExpression,
      eventSpecifier: eventSpecifierString,
      archivalPeriodSeconds: archivalPeriod * archivalPeriodUnit,
      initialDelaySeconds: initialDelay * initialDelayUnit,
      preservedArchives,
      maxAgeSeconds: maxAge * maxAgeUnit,
      maxSizeBytes: maxSize * maxSizeUnit,
    };
    setLoading(true);
    addSubscription(
      context.api.createRule(rule).subscribe((success) => {
        setLoading(false);
        if (success) {
          exitForm();
        }
      }),
    );
  }, [setLoading, addSubscription, exitForm, context.api, notifications, formData, eventSpecifierString]);

  React.useEffect(() => {
    const matchedTargets = matchedTargetsRef.current;
    addSubscription(
      matchedTargets
        .pipe(
          debounceTime(100),
          switchMap((targets) =>
            iif(
              () => targets.length > 0,
              forkJoin(
                targets.map((t) =>
                  context.api.getTargetEventTemplates(t, true, true).pipe(
                    catchError((_) => of<EventTemplate[]>([])), // Fail silently
                  ),
                ),
              ).pipe(
                map((allTemplates) => {
                  const allFiltered = allTemplates.filter((ts) => ts.length);
                  return allFiltered.length
                    ? allFiltered.reduce((acc, curr) => _.intersectionWith(acc, curr, _.isEqual))
                    : [];
                }),
              ),
              of([]),
            ),
          ),
        )
        .subscribe((templates: EventTemplate[]) => {
          setTemplates(templates);
          setFormData((old) => {
            const matched = templates.find((t) => t.name === old.template?.name && t.type === old.template?.type);
            return { ...old, template: matched ? { name: matched.name, type: matched.type } : undefined };
          });
        }),
    );
  }, [addSubscription, context.api]);

  React.useEffect(() => {
    const matchedTargets = matchedTargetsRef.current;
    addSubscription(
      combineLatest([
        matchExprService.searchExpression({
          immediateFn: () => {
            setEvaluating(true);
            setFormData((old) => ({ ...old, matchExpressionValid: ValidatedOptions.default }));
          },
        }),
        context.targets.targets().pipe(tap((ts) => setSampleTarget(ts[0]))),
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
          setFormData((old) => ({
            ...old,
            matchExpressionValid: err
              ? ValidatedOptions.error
              : !ts
                ? ValidatedOptions.default
                : ts.length
                  ? ValidatedOptions.success
                  : ValidatedOptions.warning,
          }));
          matchedTargets.next(ts || []);
        }),
    );
  }, [matchExprService, context.api, context.targets, setSampleTarget, setFormData, setEvaluating, addSubscription]);

  return (
    <Form>
      <Text component={TextVariants.small}>{t('CreateRule.ABOUT')}</Text>
      <FormGroup label={t('NAME', { ns: 'common' })} isRequired fieldId="rule-name" data-quickstart-id="rule-name">
        <TextInput
          value={formData.name}
          isDisabled={loading}
          isRequired
          type="text"
          id="rule-name"
          aria-describedby="rule-name-helper"
          onChange={handleNameChange}
          validated={formData.nameValid}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={formData.nameValid}>
              {formData.nameValid === ValidatedOptions.error
                ? t('CreateRule.NAME_HINT')
                : t('CreateRule.NAME_HELPER_TEXT')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label={t('DESCRIPTION', { ns: 'common' })}
        fieldId="rule-description"
        data-quickstart-id="rule-description"
      >
        <TextArea
          value={formData.description}
          isDisabled={loading}
          type="text"
          id="rule-description"
          aria-describedby="rule-description-helper"
          resizeOrientation="vertical"
          autoResize
          onChange={handleDescriptionChange}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.DESCRIPTION_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label={t('MATCH_EXPRESSION', { ns: 'common' })}
        labelIcon={
          <Popover
            appendTo={portalRoot}
            headerContent={t('CreateRule.MATCH_EXPRESSION_HINT_MODAL_HEADER')}
            bodyContent={
              <>
                {t('CreateRule.MATCH_EXPRESSION_HINT_BODY')}
                <MatchExpressionHint target={sampleTarget} />
              </>
            }
            hasAutoWidth
          >
            <Button
              variant="plain"
              aria-label={t('CreateRule.ARIA_LABELS.HELPER_ICON')}
              data-quickstart-id="rule-matchexpr-help"
            >
              <HelpIcon />
            </Button>
          </Popover>
        }
        isRequired
        fieldId="rule-matchexpr"
        data-quickstart-id="rule-matchexpr"
      >
        <TextArea
          value={formData.matchExpression}
          isDisabled={loading}
          isRequired
          type="text"
          id="rule-matchexpr"
          aria-describedby="rule-matchexpr-helper"
          resizeOrientation="vertical"
          autoResize
          onChange={handleMatchExpressionChange}
          validated={formData.matchExpressionValid}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={formData.matchExpressionValid}>
              {evaluating ? (
                t('CreateRule.EVALUATING_EXPRESSION')
              ) : formData.matchExpressionValid === ValidatedOptions.warning ? (
                t('CreateRule.WARNING_NO_MATCH')
              ) : formData.matchExpressionValid === ValidatedOptions.error ? (
                t('CreateRule.FAILING_EVALUATION')
              ) : (
                <Trans t={t} components={{ a: <a target="_blank" href={CEL_SPEC_HREF} /> }}>
                  CreateRule.MATCH_EXPRESSION_HELPER_TEXT
                </Trans>
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('ENABLED', { ns: 'common' })} isRequired fieldId="rule-enabled">
        <Switch
          id="rule-enabled"
          isDisabled={loading}
          aria-label="Apply this rule to matching targets"
          isChecked={formData.enabled}
          onChange={handleEnabledChange}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.ENABLE_SWITCH_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label={t('TEMPLATE', { ns: 'common' })}
        isRequired
        fieldId="recording-template"
        data-quickstart-id="rule-evt-template"
      >
        <SelectTemplateSelectorForm
          selected={selectedSpecifier}
          disabled={loading}
          validated={!formData.template?.name ? ValidatedOptions.default : ValidatedOptions.success}
          templates={templates}
          onSelect={handleTemplateChange}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={!formData.template?.name ? ValidatedOptions.default : ValidatedOptions.success}>
              {!formData.template?.name ? t('CreateRule.TEMPLATE_HINT') : t('CreateRule.TEMPLATE_HELPER_TEXT')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('MAXIMUM_SIZE', { ns: 'common' })} fieldId="maxSize" data-quickstart-id="rule-max-size">
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={formData.maxSize}
              isDisabled={loading}
              isRequired
              type="number"
              id="maxSize"
              aria-label="max size value"
              onChange={handleMaxSizeChange}
              min="0"
            />
          </SplitItem>
          <SplitItem>
            <FormSelect
              className="rules_form_select"
              value={formData.maxSizeUnit}
              isDisabled={loading}
              onChange={handleMaxSizeUnitChange}
              aria-label="Max size units input"
            >
              <FormSelectOption key="1" value="1" label="B" />
              <FormSelectOption key="2" value={1024} label="KiB" />
              <FormSelectOption key="3" value={1024 * 1024} label="MiB" />
            </FormSelect>
          </SplitItem>
        </Split>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.MAXSIZE_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('MAXIMUM_AGE', { ns: 'common' })} fieldId="maxAge" data-quickstart-id="rule-max-age">
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={formData.maxAge}
              isDisabled={loading}
              isRequired
              type="number"
              id="maxAge"
              aria-label="Max age duration"
              onChange={handleMaxAgeChange}
              min="0"
            />
          </SplitItem>
          <SplitItem>
            <FormSelect
              className="rules_form_select"
              value={formData.maxAgeUnit}
              isDisabled={loading}
              onChange={handleMaxAgeUnitChange}
              aria-label="Max Age units Input"
            >
              <FormSelectOption key="1" value="1" label={t('SECOND_other', { ns: 'common' })} />
              <FormSelectOption key="2" value={60} label={t('MINUTE_other', { ns: 'common' })} />
              <FormSelectOption key="3" value={60 * 60} label={t('HOUR_other', { ns: 'common' })} />
            </FormSelect>
          </SplitItem>
        </Split>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.MAXAGE_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label={t('ARCHIVAL_PERIOD', { ns: 'common' })}
        fieldId="archivalPeriod"
        data-quickstart-id="rule-archival-period"
      >
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={formData.archivalPeriod}
              isDisabled={loading}
              isRequired
              type="number"
              id="archivalPeriod"
              aria-label="archival period"
              onChange={handleArchivalPeriodChange}
              min="0"
            />
          </SplitItem>
          <SplitItem>
            <FormSelect
              className="rules_form_select"
              value={formData.archivalPeriodUnit}
              isDisabled={loading}
              onChange={handleArchivalPeriodUnitsChange}
              aria-label="archival period units input"
            >
              <FormSelectOption key="1" value="1" label={t('SECOND_other', { ns: 'common' })} />
              <FormSelectOption key="2" value={60} label={t('MINUTE_other', { ns: 'common' })} />
              <FormSelectOption key="3" value={60 * 60} label={t('HOUR_other', { ns: 'common' })} />
            </FormSelect>
          </SplitItem>
        </Split>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.ARCHIVAL_PERIOD_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label={t('INITIAL_DELAY', { ns: 'common' })}
        fieldId="initialDelay"
        data-quickstart-id="rule-initial-delay"
      >
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={formData.initialDelay}
              isDisabled={loading}
              isRequired
              type="number"
              id="initialDelay"
              aria-label="initial delay"
              onChange={handleInitialDelayChange}
              min="0"
            />
          </SplitItem>
          <SplitItem>
            <FormSelect
              className="rules_form_select"
              value={formData.initialDelayUnit}
              isDisabled={loading}
              onChange={handleInitialDelayUnitsChanged}
              aria-label="initial delay units input"
            >
              <FormSelectOption key="1" value="1" label={t('SECOND_other', { ns: 'common' })} />
              <FormSelectOption key="2" value={60} label={t('MINUTE_other', { ns: 'common' })} />
              <FormSelectOption key="3" value={60 * 60} label={t('HOUR_other', { ns: 'common' })} />
            </FormSelect>
          </SplitItem>
        </Split>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.INITIAL_DELAY_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label={t('PRESERVED_ARCHIVES', { ns: 'common' })}
        fieldId="preservedArchives"
        data-quickstart-id="rule-preserved-archives"
      >
        <TextInput
          value={formData.preservedArchives}
          isDisabled={loading}
          isRequired
          type="number"
          id="preservedArchives"
          aria-label="preserved archives"
          onChange={handlePreservedArchivesChange}
          min="0"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.PRESERVED_ARCHIVES_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <ActionGroup>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={
            loading ||
            formData.nameValid !== ValidatedOptions.success ||
            !formData.template?.name ||
            !formData.template?.type ||
            !formData.matchExpression
          }
          data-quickstart-id="rule-create-btn"
          {...createButtonLoadingProps}
        >
          {t(loading ? 'CREATING' : 'CREATE', { ns: 'common' })}
        </Button>
        <Button variant="secondary" onClick={exitForm} isAriaDisabled={loading}>
          {t('CANCEL', { ns: 'common' })}
        </Button>
      </ActionGroup>
    </Form>
  );
};

export const CreateRule: React.FC = () => {
  const matchExpreRef = React.useRef(new MatchExpressionService());
  const { t } = useTranslation();

  const breadcrumbs: BreadcrumbTrail[] = React.useMemo(
    () => [
      {
        title: t('AUTOMATED_RULES', { ns: 'common' }),
        path: '/rules',
      },
    ],
    [t],
  );

  const gridStyles: React.CSSProperties = React.useMemo(
    () => ({
      // viewportHeight - masterheadHeight - pageSectionPadding - breadcrumbHeight
      height: 'calc(100vh - 4.375rem - 48px - 1.5rem)',
    }),
    [],
  );

  return (
    <BreadcrumbPage pageTitle={t('CREATE', { ns: 'common' })} breadcrumbs={breadcrumbs}>
      <SearchExprServiceContext.Provider value={matchExpreRef.current} data-full-height>
        <Grid hasGutter style={gridStyles}>
          <GridItem xl={5} order={{ xl: '0', default: '1' }}>
            <Card isFullHeight>
              <CardBody className="overflow-auto">
                <CreateRuleForm />
              </CardBody>
            </Card>
          </GridItem>
          <GridItem xl={7} order={{ xl: '1', default: '0' }}>
            <Card isFullHeight>
              <CardTitle>{t('MATCH_EXPRESSION_VISUALIZER.TITLE')}</CardTitle>
              <CardBody className="overflow-auto" data-quickstart-id="match-expr-card">
                <MatchExpressionVisualizer />
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </SearchExprServiceContext.Provider>
    </BreadcrumbPage>
  );
};

export default CreateRule;
