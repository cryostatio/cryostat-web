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
import { templateFromEventSpecifier } from '@app/CreateRecording/utils';
import { MatchExpressionHint } from '@app/Shared/Components/MatchExpression/MatchExpressionHint';
import { MatchExpressionVisualizer } from '@app/Shared/Components/MatchExpression/MatchExpressionVisualizer';
import { SelectTemplateSelectorForm } from '@app/Shared/Components/SelectTemplateSelectorForm';
import { LoadingProps } from '@app/Shared/Components/types';
import { EventTemplate, Target, Rule, Metadata } from '@app/Shared/Services/api.types';
import { MatchExpressionService } from '@app/Shared/Services/MatchExpression.service';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { SearchExprServiceContext } from '@app/Shared/Services/service.utils';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useMatchExpressionSvc } from '@app/utils/hooks/useMatchExpressionSvc';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot, toPath } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
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
import { Trans } from 'react-i18next';
import { useExitForm } from '@app/utils/hooks/useExitForm';
import { useLocation } from 'react-router-dom-v5-compat';
import { combineLatest, forkJoin, iif, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { RuleFormData } from './types';
import { CEL_SPEC_HREF, isRuleNameValid } from './utils';

export interface CreateRuleFormProps {
  onExit?: () => void;
}

export const AUTOANALYZE_KEY = 'autoanalyze';

export const CreateRuleForm: React.FC<CreateRuleFormProps> = ({ onExit }) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const location = useLocation();
  const { t } = useCryostatTranslation();
  // Do not use useSearchExpression for display. This causes the cursor to jump to the end due to async updates.
  const matchExprService = useMatchExpressionSvc();
  const addSubscription = useSubscriptions();
  const [autoanalyze, setAutoanalyze] = React.useState(true);
  const [isExistingEdit, setExistingEdit] = React.useState(false);

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

  React.useEffect(() => {
    setExistingEdit(location?.state?.edit ?? false);
  }, [location, setExistingEdit]);

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

  React.useEffect(() => {
    const prefilled: Partial<RuleFormData> = location.state || {};
    const eventSpecifier = location?.state?.eventSpecifier;
    const maxAgeSeconds = location?.state?.maxAgeSeconds;
    const maxSizeBytes = location?.state?.maxSizeBytes;
    const archivalPeriodSeconds = location?.state?.archivalPeriodSeconds;
    let {
      name,
      enabled,
      description,
      matchExpression,
      maxAge,
      maxAgeUnit,
      maxSize,
      maxSizeUnit,
      archivalPeriod,
      archivalPeriodUnit,
      initialDelay,
      initialDelayUnit,
      preservedArchives,
    } = prefilled;
    setFormData((old) => ({
      ...old,
      enabled: enabled ?? true,
      name: name ?? '',
      description: description ?? '',
      matchExpression: matchExpression ?? '',
      template: templateFromEventSpecifier(eventSpecifier),
      maxAge: maxAgeSeconds ?? maxAge ?? 0,
      maxAgeUnit: maxAgeSeconds ? 1 : (maxAgeUnit ?? 1),
      maxSize: maxSizeBytes ?? maxSize ?? 0,
      maxSizeUnit: maxSizeBytes ? 1 : (maxSizeUnit ?? 1),
      archivalPeriod: archivalPeriodSeconds ?? archivalPeriod ?? 0,
      archivalPeriodUnit: archivalPeriodSeconds ? 1 : (archivalPeriodUnit ?? 1),
      initialDelay: initialDelay ?? 0,
      initialDelayUnit: initialDelayUnit ?? 1,
      preservedArchives: preservedArchives ?? 0,
    }));
    handleNameChange(null, name ?? '');
    if (matchExpression) {
      handleMatchExpressionChange(null, matchExpression);
    }
  }, [location, setFormData, handleNameChange, handleMatchExpressionChange]);

  const handleTemplateChange = React.useCallback(
    (template: EventTemplateIdentifier) => setFormData((old) => ({ ...old, template })),
    [setFormData],
  );

  const handleEnabledChange = React.useCallback(
    (_, enabled: boolean) => setFormData((old) => ({ ...old, enabled })),
    [setFormData],
  );

  const handleAutoAnalyzeChange = React.useCallback(
    (_, autoanalyze: boolean) => setAutoanalyze(autoanalyze),
    [setAutoanalyze],
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

  const exitForm = useExitForm(onExit);

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
    const metadata: Metadata = {
      labels: [
        {
          key: AUTOANALYZE_KEY,
          value: `${autoanalyze}`,
        },
      ],
    };
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
      metadata,
    };
    setLoading(true);
    addSubscription(
      (isExistingEdit ? context.api.updateRule(rule, true) : context.api.createRule(rule)).subscribe((success) => {
        setLoading(false);
        if (success) {
          exitForm();
        }
      }),
    );
  }, [
    setLoading,
    addSubscription,
    exitForm,
    context.api,
    notifications,
    formData,
    autoanalyze,
    eventSpecifierString,
    isExistingEdit,
  ]);

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
              context.api.getEventTemplates().pipe(catchError((_) => of<EventTemplate[]>([]))),
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
      <FormGroup label={t('NAME')} isRequired fieldId="rule-name" data-quickstart-id="rule-name">
        <TextInput
          value={formData.name}
          isDisabled={isExistingEdit || loading}
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
      <FormGroup label={t('DESCRIPTION')} fieldId="rule-description" data-quickstart-id="rule-description">
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
        label={t('MATCH_EXPRESSION')}
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
      <FormGroup label={t('ENABLED')} isRequired fieldId="rule-enabled">
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
      <FormGroup label={t('TEMPLATE')} isRequired fieldId="recording-template" data-quickstart-id="rule-evt-template">
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
      <FormGroup label={t('AUTOANALYZE')} fieldId="rule-autoanalyze">
        <Switch
          id="rule-autoanalyze"
          isDisabled={loading}
          aria-label="Automatically analyze archived copies of this recording"
          isChecked={autoanalyze}
          onChange={handleAutoAnalyzeChange}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('AUTOANALYZE_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('MAXIMUM_SIZE')} fieldId="maxSize" data-quickstart-id="rule-max-size">
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
      <FormGroup label={t('MAXIMUM_AGE')} fieldId="maxAge" data-quickstart-id="rule-max-age">
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
              <FormSelectOption key="1" value="1" label={t('SECOND_other')} />
              <FormSelectOption key="2" value={60} label={t('MINUTE_other')} />
              <FormSelectOption key="3" value={60 * 60} label={t('HOUR_other')} />
            </FormSelect>
          </SplitItem>
        </Split>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.MAXAGE_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('ARCHIVAL_PERIOD')} fieldId="archivalPeriod" data-quickstart-id="rule-archival-period">
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
              <FormSelectOption key="1" value="1" label={t('SECOND_other')} />
              <FormSelectOption key="2" value={60} label={t('MINUTE_other')} />
              <FormSelectOption key="3" value={60 * 60} label={t('HOUR_other')} />
            </FormSelect>
          </SplitItem>
        </Split>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('CreateRule.ARCHIVAL_PERIOD_HELPER_TEXT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('INITIAL_DELAY')} fieldId="initialDelay" data-quickstart-id="rule-initial-delay">
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
              <FormSelectOption key="1" value="1" label={t('SECOND_other')} />
              <FormSelectOption key="2" value={60} label={t('MINUTE_other')} />
              <FormSelectOption key="3" value={60 * 60} label={t('HOUR_other')} />
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
        label={t('PRESERVED_ARCHIVES')}
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
          {t(isExistingEdit ? (loading ? 'UPDATING' : 'UPDATE') : loading ? 'CREATING' : 'CREATE')}
        </Button>
        <Button variant="secondary" onClick={exitForm} isAriaDisabled={loading}>
          {t('CANCEL')}
        </Button>
      </ActionGroup>
    </Form>
  );
};

export interface CreateRuleProps {
  embedded?: boolean;
  onClose?: () => void;
}

export const CreateRule: React.FC<CreateRuleProps> = ({ embedded, onClose }) => {
  const matchExpreRef = React.useRef(new MatchExpressionService());
  const { t } = useCryostatTranslation();

  const breadcrumbs: BreadcrumbTrail[] = React.useMemo(
    () => [
      {
        title: t('AUTOMATED_RULES'),
        path: toPath('/rules'),
      },
    ],
    [t],
  );

  const gridStyles: React.CSSProperties | undefined = React.useMemo(() => {
    if (embedded) {
      // viewportHeight - modalHeader - modalPadding - margin
      return {
        height: 'calc(100vh - 12rem)',
      };
    }
    return {
      // viewportHeight - masterheadHeight - pageSectionPadding - breadcrumbHeight
      height: 'calc(100vh - 4.375rem - 48px - 1.5rem)',
    };
  }, [embedded]);

  const content = (
    <SearchExprServiceContext.Provider value={matchExpreRef.current} data-full-height>
      <Grid hasGutter style={gridStyles}>
        <GridItem xl={5} order={{ xl: '0', default: '1' }}>
          <Card isFullHeight>
            <CardBody className="overflow-auto">
              <CreateRuleForm onExit={onClose} />
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
  );

  if (embedded) {
    return content;
  }

  return (
    <BreadcrumbPage pageTitle={t('CREATE')} breadcrumbs={breadcrumbs}>
      {content}
    </BreadcrumbPage>
  );
};

export default CreateRule;
