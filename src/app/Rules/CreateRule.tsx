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
import { BreadcrumbPage, BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { MatchExpressionHint } from '@app/Shared/MatchExpression/MatchExpressionHint';
import { MatchExpressionVisualizer } from '@app/Shared/MatchExpression/MatchExpressionVisualizer';
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import { SelectTemplateSelectorForm } from '@app/Shared/SelectTemplateSelectorForm';
import { TemplateType } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { SearchExprService, SearchExprServiceContext, useExprSvc } from '@app/Topology/Shared/utils';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import {
  ActionGroup,
  Button,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
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
import { useHistory, withRouter } from 'react-router-dom';
import { forkJoin, iif, of, Subject } from 'rxjs';
import { catchError, concatMap, debounceTime, map, switchMap } from 'rxjs/operators';
import { Rule } from './Rules';

// FIXME check if this is correct/matches backend name validation
export const RuleNamePattern = /^[\w_]+$/;

interface CreateRuleFormProps {}

const CreateRuleForm: React.FC<CreateRuleFormProps> = ({ ...props }) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();
  // Do not use useSearchExpression hook for display.
  // This causes the cursor to jump to the end due to async updates.
  const matchExprService = useExprSvc();
  // Use this for displaying match expression input
  const [matchExpressionInput, setMatchExpressionInput] = React.useState('');
  const addSubscription = useSubscriptions();

  const [name, setName] = React.useState('');
  const [nameValid, setNameValid] = React.useState(ValidatedOptions.default);
  const [description, setDescription] = React.useState('');
  const [enabled, setEnabled] = React.useState(true);
  const [matchExpressionValid, setMatchExpressionValid] = React.useState(ValidatedOptions.default);
  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [template, setTemplate] = React.useState<Pick<Partial<EventTemplate>, 'name' | 'type'>>({});
  const [maxAge, setMaxAge] = React.useState(0);
  const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
  const [maxSize, setMaxSize] = React.useState(0);
  const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
  const [archivalPeriod, setArchivalPeriod] = React.useState(0);
  const [archivalPeriodUnits, setArchivalPeriodUnits] = React.useState(1);
  const [initialDelay, setInitialDelay] = React.useState(0);
  const [initialDelayUnits, setInitialDelayUnits] = React.useState(1);
  const [preservedArchives, setPreservedArchives] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [targets, setTargets] = React.useState<Target[]>([]);

  const matchedTargetsRef = React.useRef(new Subject<Target[]>());
  const matchedTargets = matchedTargetsRef.current;

  const handleNameChange = React.useCallback(
    (name) => {
      setNameValid(RuleNamePattern.test(name) ? ValidatedOptions.success : ValidatedOptions.error);
      setName(name);
    },
    [setNameValid, setName]
  );

  const eventSpecifierString = React.useMemo(() => {
    let str = '';
    const { name, type } = template;
    if (name) {
      str += `template=${name}`;
    }
    if (type) {
      str += `,type=${type}`;
    }
    return str;
  }, [template]);

  const handleTemplateChange = React.useCallback(
    (templateName?: string, templateType?: TemplateType) => {
      setTemplate({
        name: templateName,
        type: templateType,
      });
    },
    [setTemplate]
  );

  const handleMaxAgeChange = React.useCallback((maxAge) => setMaxAge(Number(maxAge)), [setMaxAge]);

  const handleMaxAgeUnitChange = React.useCallback(
    (maxAgeUnit) => setMaxAgeUnits(Number(maxAgeUnit)),
    [setMaxAgeUnits]
  );

  const handleMaxSizeChange = React.useCallback((maxSize) => setMaxSize(Number(maxSize)), [setMaxSize]);

  const handleMaxSizeUnitChange = React.useCallback(
    (maxSizeUnit) => setMaxSizeUnits(Number(maxSizeUnit)),
    [setMaxSizeUnits]
  );

  const handleArchivalPeriodChange = React.useCallback(
    (archivalPeriod) => setArchivalPeriod(Number(archivalPeriod)),
    [setArchivalPeriod]
  );

  const handleArchivalPeriodUnitsChange = React.useCallback(
    (evt) => setArchivalPeriodUnits(Number(evt)),
    [setArchivalPeriodUnits]
  );

  const handleInitialDelayChange = React.useCallback(
    (initialDelay) => setInitialDelay(Number(initialDelay)),
    [setInitialDelay]
  );

  const handleInitialDelayUnitsChanged = React.useCallback(
    (initialDelayUnit) => setInitialDelayUnits(Number(initialDelayUnit)),
    [setInitialDelayUnits]
  );

  const handlePreservedArchivesChange = React.useCallback(
    (preservedArchives) => setPreservedArchives(Number(preservedArchives)),
    [setPreservedArchives]
  );

  const handleSubmit = React.useCallback((): void => {
    setLoading(true);
    const notificationMessages: string[] = [];
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
      matchExpression: matchExpressionInput,
      eventSpecifier: eventSpecifierString,
      archivalPeriodSeconds: archivalPeriod * archivalPeriodUnits,
      initialDelaySeconds: initialDelay * initialDelayUnits,
      preservedArchives,
      maxAgeSeconds: maxAge * maxAgeUnits,
      maxSizeBytes: maxSize * maxSizeUnits,
    };
    addSubscription(
      context.api.createRule(rule).subscribe((success) => {
        setLoading(false);
        if (success) {
          history.push('/rules');
        }
      })
    );
  }, [
    setLoading,
    addSubscription,
    context.api,
    history,
    notifications,
    name,
    nameValid,
    description,
    enabled,
    matchExpressionInput,
    eventSpecifierString,
    archivalPeriod,
    archivalPeriodUnits,
    initialDelay,
    initialDelayUnits,
    preservedArchives,
    maxAge,
    maxAgeUnits,
    maxSize,
    maxSizeUnits,
  ]);

  React.useEffect(() => {
    addSubscription(
      matchedTargets
        .pipe(
          debounceTime(100),
          switchMap((targets) =>
            iif(
              () => targets.length > 0,
              forkJoin(
                targets.map((t) =>
                  context.api
                    .doGet<EventTemplate[]>(
                      `targets/${encodeURIComponent(t.connectUrl)}/templates`,
                      'v1',
                      undefined,
                      true,
                      true
                    )
                    .pipe(
                      catchError((_) => of<EventTemplate[]>([])) // Fail silently
                    )
                )
              ).pipe(
                map((allTemplates) => {
                  const allFiltered = allTemplates.filter((ts) => ts.length);
                  return allFiltered.length
                    ? allFiltered.reduce((acc, curr) => _.intersectionWith(acc, curr, _.isEqual))
                    : [];
                })
              ),
              of([])
            )
          )
        )
        .subscribe((templates) => {
          setTemplates(templates);
          setTemplate((old) => {
            const matched = templates.find((t) => t.name === old.name && t.type === t.type);
            return matched ? { name: matched.name, type: matched.type } : {};
          });
        })
    );
  }, [addSubscription, context.api, matchedTargets]);

  React.useEffect(() => {
    addSubscription(context.targets.targets().subscribe(setTargets));
  }, [addSubscription, context.targets, setTargets]);

  React.useEffect(() => {
    if (targets.length > 0) {
      addSubscription(
        matchExprService
          .searchExpression(100)
          .pipe(concatMap((input) => context.api.matchTargetsWithExpr(input, targets)))
          .subscribe({
            next: (ts) => {
              setMatchExpressionValid(ts.length ? ValidatedOptions.success : ValidatedOptions.warning);
              matchedTargets.next(ts);
            },
            error: (_) => {
              setMatchExpressionValid(ValidatedOptions.error);
            },
          })
      );
    }
  }, [matchExprService, targets, matchedTargets, context.api, setMatchExpressionValid, addSubscription]);

  const createButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'creating-automated-rule',
        isLoading: loading,
      } as LoadingPropsType),
    [loading]
  );

  const selectedSpecifier = React.useMemo(() => {
    const { name, type } = template;
    if (name && type) {
      return `${name},${type}`;
    }
    return '';
  }, [template]);

  return (
    <Form {...props}>
      <Text component={TextVariants.small}>
        Automated Rules are configurations that instruct Cryostat to create JDK Flight Recordings on matching target JVM
        applications. Each Automated Rule specifies parameters for which Event Template to use, how much data should be
        kept in the application recording buffer, and how frequently Cryostat should copy the application recording
        buffer into Cryostat&apos;s own archived storage.
      </Text>
      <FormGroup
        label="Name"
        isRequired
        fieldId="rule-name"
        helperText="Enter a rule name."
        helperTextInvalid="A rule name can contain only letters, numbers, and underscores."
        validated={nameValid}
        data-quickstart-id="rule-name"
      >
        <TextInput
          value={name}
          isDisabled={loading}
          isRequired
          type="text"
          id="rule-name"
          aria-describedby="rule-name-helper"
          onChange={handleNameChange}
          validated={nameValid}
        />
      </FormGroup>
      <FormGroup
        label="Description"
        fieldId="rule-description"
        helperText="Enter a rule description. This is only used for display purposes to aid in identifying rules and their intentions."
        data-quickstart-id="rule-description"
      >
        <TextArea
          value={description}
          isDisabled={loading}
          type="text"
          id="rule-description"
          aria-describedby="rule-description-helper"
          resizeOrientation="vertical"
          autoResize
          onChange={setDescription}
        />
      </FormGroup>
      <FormGroup
        label="Match Expression"
        labelIcon={
          <Popover
            appendTo={portalRoot}
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
              data-quickstart-id="rule-matchexpr-help"
            >
              <HelpIcon />
            </Button>
          </Popover>
        }
        isRequired
        fieldId="rule-matchexpr"
        helperText={
          matchExpressionValid === ValidatedOptions.warning
            ? `Warning: Match expression matches no targets.`
            : `
  Enter a match expression. This is a Java-like code snippet that is evaluated against each target
  application to determine whether the rule should be applied.`
        }
        helperTextInvalid="The expression matching failed."
        validated={matchExpressionValid}
        data-quickstart-id="rule-matchexpr"
      >
        <TextArea
          value={matchExpressionInput}
          isDisabled={loading}
          isRequired
          type="text"
          id="rule-matchexpr"
          aria-describedby="rule-matchexpr-helper"
          resizeOrientation="vertical"
          autoResize
          onChange={(value) => {
            setMatchExpressionInput(value);
            matchExprService.setSearchExpression(value);
          }}
          validated={matchExpressionValid}
        />
      </FormGroup>
      <FormGroup
        label="Enabled"
        isRequired
        fieldId="rule-enabled"
        helperText={`Rules take effect when created if enabled and will be matched against all
discovered target applications immediately. When new target applications appear they are
checked against all enabled rules. Disabled rules have no effect but are available to be
enabled in the future.`}
      >
        <Switch
          id="rule-enabled"
          isDisabled={loading}
          aria-label="Apply this rule to matching targets"
          isChecked={enabled}
          onChange={setEnabled}
        />
      </FormGroup>
      <FormGroup
        label="Template"
        isRequired
        fieldId="recording-template"
        validated={!template.name ? ValidatedOptions.default : ValidatedOptions.success}
        helperText="The Event Template to be applied by this Rule against matching target applications."
        helperTextInvalid="A Template must be selected"
        data-quickstart-id="rule-evt-template"
      >
        <SelectTemplateSelectorForm
          selected={selectedSpecifier}
          disabled={loading}
          validated={!template.name ? ValidatedOptions.default : ValidatedOptions.success}
          templates={templates}
          onSelect={handleTemplateChange}
        />
      </FormGroup>
      <FormGroup
        label="Maximum Size"
        fieldId="maxSize"
        helperText="The maximum size of recording data retained in the target application's recording buffer."
        data-quickstart-id="rule-max-size"
      >
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={maxSize}
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
              value={maxSizeUnits}
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
      </FormGroup>
      <FormGroup
        label="Maximum Age"
        fieldId="maxAge"
        helperText="The maximum age of recording data retained in the target application's recording buffer."
        data-quickstart-id="rule-max-age"
      >
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={maxAge}
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
              value={maxAgeUnits}
              isDisabled={loading}
              onChange={handleMaxAgeUnitChange}
              aria-label="Max Age units Input"
            >
              <FormSelectOption key="1" value="1" label="Seconds" />
              <FormSelectOption key="2" value={60} label="Minutes" />
              <FormSelectOption key="3" value={60 * 60} label="Hours" />
            </FormSelect>
          </SplitItem>
        </Split>
      </FormGroup>
      <FormGroup
        label="Archival Period"
        fieldId="archivalPeriod"
        helperText="Time between copies of active recording data being pulled into Cryostat archive storage."
        data-quickstart-id="rule-archival-period"
      >
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={archivalPeriod}
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
              value={archivalPeriodUnits}
              isDisabled={loading}
              onChange={handleArchivalPeriodUnitsChange}
              aria-label="archival period units input"
            >
              <FormSelectOption key="1" value="1" label="Seconds" />
              <FormSelectOption key="2" value={60} label="Minutes" />
              <FormSelectOption key="3" value={60 * 60} label="Hours" />
            </FormSelect>
          </SplitItem>
        </Split>
      </FormGroup>
      <FormGroup
        label="Initial Delay"
        fieldId="initialDelay"
        helperText="Initial delay before archiving starts. The first archived copy will be made this long after the recording is started. The second archived copy will occur one Archival Period later."
        data-quickstart-id="rule-initial-delay"
      >
        <Split hasGutter={true}>
          <SplitItem isFilled>
            <TextInput
              value={initialDelay}
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
              value={initialDelayUnits}
              isDisabled={loading}
              onChange={handleInitialDelayUnitsChanged}
              aria-label="initial delay units input"
            >
              <FormSelectOption key="1" value="1" label="Seconds" />
              <FormSelectOption key="2" value={60} label="Minutes" />
              <FormSelectOption key="3" value={60 * 60} label="Hours" />
            </FormSelect>
          </SplitItem>
        </Split>
      </FormGroup>
      <FormGroup
        label="Preserved Archives"
        fieldId="preservedArchives"
        helperText="The number of archived recording copies to preserve in archives for each target application affected by this rule."
        data-quickstart-id="rule-preserved-archives"
      >
        <TextInput
          value={preservedArchives}
          isDisabled={loading}
          isRequired
          type="number"
          id="preservedArchives"
          aria-label="preserved archives"
          onChange={handlePreservedArchivesChange}
          min="0"
        />
      </FormGroup>
      <ActionGroup>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={
            loading ||
            nameValid !== ValidatedOptions.success ||
            !template.name ||
            !template.type ||
            !matchExpressionInput
          }
          data-quickstart-id="rule-create-btn"
          {...createButtonLoadingProps}
        >
          {loading ? 'Creating' : 'Create'}
        </Button>
        <Button variant="secondary" onClick={history.goBack} isAriaDisabled={loading}>
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
};

const Comp: React.FC = () => {
  const matchExpreRef = React.useRef(new SearchExprService());
  const breadcrumbs: BreadcrumbTrail[] = React.useMemo(
    () => [
      {
        title: 'Automated Rules',
        path: '/rules',
      },
    ],
    []
  );

  const gridStyles: React.CSSProperties = React.useMemo(
    () => ({
      // viewportHeight - masterheadHeight - pageSectionPadding - breadcrumbHeight
      height: 'calc(100vh - 4.375rem - 48px - 1.5rem)',
    }),
    []
  );

  return (
    <BreadcrumbPage pageTitle="Create" breadcrumbs={breadcrumbs}>
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
              <CardTitle>Match Expression Visualizer</CardTitle>
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

export const CreateRule = withRouter(Comp);

export default CreateRule;
