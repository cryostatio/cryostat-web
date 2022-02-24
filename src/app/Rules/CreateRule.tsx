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
import * as React from 'react';
import { ActionGroup, Button, Card, CardBody, Form, FormGroup, FormSelect, FormSelectOption, FormSelectOptionGroup, Split, SplitItem, Text, TextInput, TextVariants, ValidatedOptions } from '@patternfly/react-core';
import { useHistory, withRouter } from 'react-router-dom';
import { first } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { BreadcrumbPage, BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { EventTemplate } from '../CreateRecording/CreateRecording';
import { Rule } from './Rules';

// FIXME check if this is correct/matches backend name validation
export const RuleNamePattern = /^[\w_]+$/;

const Comp = () => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();
  const addSubscription = useSubscriptions();

  const [name, setName] = React.useState('');
  const [nameValid, setNameValid] = React.useState(ValidatedOptions.default);
  const [description, setDescription] = React.useState('');
  // TODO validate and evaluate match expressions
  const [matchExpression, setMatchExpression] = React.useState('');
  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [template, setTemplate] = React.useState(null as string | null);
  const [templateType, setTemplateType] = React.useState(null as string | null);
  const [maxAge, setMaxAge] = React.useState(0);
  const [maxAgeUnits, setMaxAgeUnits] = React.useState(1);
  const [maxSize, setMaxSize] = React.useState(0);
  const [maxSizeUnits, setMaxSizeUnits] = React.useState(1);
  const [archivalPeriod, setArchivalPeriod] = React.useState(0);
  const [archivalPeriodUnits, setArchivalPeriodUnits] = React.useState(1);
  const [preservedArchives, setPreservedArchives] = React.useState(0);

  const handleNameChange = (evt) => {
    setNameValid(RuleNamePattern.test(name) ? ValidatedOptions.success : ValidatedOptions.error);
    setName(evt);
  };

  const getEventString = () => {
    var str = '';
    if (!!template) {
      str += `template=${template}`;
    }
    if (!!templateType) {
      str += `,type=${templateType}`;
    }
    return str;
  };

  const handleTemplateChange = (template) => {
    const parts: string[] = template.split(',');
    setTemplate(parts[0]);
    setTemplateType(parts[1]);
  };

  const handleMaxAgeChange = (evt) => {
    setMaxAge(Number(evt));
  };

  const handleMaxAgeUnitChange = (evt) => {
    setMaxAgeUnits(Number(evt));
  };

  const handleMaxSizeChange = (evt) => {
    setMaxSize(Number(evt));
  };

  const handleMaxSizeUnitChange = (evt) => {
    setMaxSizeUnits(Number(evt));
  };

  const handleArchivalPeriodChange = (evt) => {
    setArchivalPeriod(Number(evt));
  };

  const handleArchivalPeriodUnitsChange = (evt) => {
    setArchivalPeriodUnits(Number(evt));
  };

  const handleSetPreservedArchives = (evt) => {
    setPreservedArchives(Number(evt));
  };

  const handleSubmit = (): void => {
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
      matchExpression,
      eventSpecifier: getEventString(),
      archivalPeriodSeconds: archivalPeriod * archivalPeriodUnits,
      preservedArchives,
      maxAgeSeconds: maxAge * maxAgeUnits,
      maxSizeBytes: maxSize * maxSizeUnits
    };
    addSubscription(
      context.api.createRule(rule)
      .pipe(first())
      .subscribe(success => {
        if (success) {
          history.push('/rules');
        }
      })
    );
  };

  // FIXME we query ourselves to populate the list of templates, since Rules can apply to any target. Is this better than making the user write the event specifier manually,
  // or at least make them write the name manually and choose TARGET/CUSTOM from a dropdown?
  React.useEffect(() => {
    addSubscription(
      context.api.doGet<EventTemplate[]>(`targets/localhost:0/templates`).subscribe(setTemplates)
    );
  }, []);

  const breadcrumbs: BreadcrumbTrail[] = [
    {
      title: 'Automated Rules',
      path: '/rules',
    }
  ];

  const templatesOptionGroups = React.useMemo(() => {
    const offset = templates.filter(t => t.type === "CUSTOM").length;
    return (<>
      <FormSelectOption key="-1" value="" label="Select a Template" isPlaceholder />
      <FormSelectOptionGroup key="-2" label="Custom Templates">
        {
          templates.filter(t => t.type === "CUSTOM").map((t: EventTemplate, idx: number) => (<FormSelectOption key={idx} value={`${t.name},${t.type}`} label={t.name} />))
        }
      </FormSelectOptionGroup>
      <FormSelectOptionGroup key="-3" label="Target Templates">
        {
          templates.filter(t => t.type === "TARGET").map((t: EventTemplate, idx: number) => (<FormSelectOption key={idx+offset} value={`${t.name},${t.type}`} label={t.name} />))
        }
      </FormSelectOptionGroup>
    </>);
  }, [templates]);

  return (
    <BreadcrumbPage pageTitle='Create' breadcrumbs={breadcrumbs} >
      <Card>
        <CardBody>
          <Form isHorizontal>
            <Text component={TextVariants.small}>
              Automated Rules are configurations that instruct Cryostat to create JDK Flight Recordings on matching
              target JVM applications. Each Automated Rule specifies parameters for which Event Template to use, how
              much data should be kept in the application recording buffer, and how frequently Cryostat should copy the
              application recording buffer into Cryostat's own archived storage.
            </Text>
            <FormGroup
              label="Name"
              isRequired
              fieldId="rule-name"
              helperText="Enter a rule name."
              validated={nameValid}
            >
              <TextInput
                value={name}
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
            >
              <TextInput
                value={description}
                type="text"
                id="rule-description"
                aria-describedby="rule-description-helper"
                onChange={setDescription}
              />
            </FormGroup>
            <FormGroup
              label="Match Expression"
              isRequired
              fieldId="rule-matchexpr"
              helperText="Enter a match expression. This is a Java-like code snippet that is evaluated against each target application to determine whether rule should be applied."
            >
              <TextInput
                value={matchExpression}
                isRequired
                type="text"
                id="rule-matchexpr"
                aria-describedby="rule-matchexpr-helper"
                onChange={setMatchExpression}
              />
            </FormGroup>
            <FormGroup
              label="Template"
              isRequired
              fieldId="recording-template"
              validated={template === null ? ValidatedOptions.default : !!template ? ValidatedOptions.success : ValidatedOptions.error}
              helperText="The Event Template to be applied by this Rule against matching target applications."
              helperTextInvalid="A Template must be selected"
            >
              <FormSelect
                value={`${template},${templateType}`}
                onChange={handleTemplateChange}
                aria-label="Event Template Input"
              >
                { templatesOptionGroups }
              </FormSelect>
            </FormGroup>
            <FormGroup
              label="Maximum Size"
              fieldId="maxSize"
              helperText="The maximum size of recording data retained in the target application's recording buffer."
            >
              <Split hasGutter={true}>
                <SplitItem isFilled>
                    <TextInput
                      value={maxSize}
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
                      onChange={handleMaxSizeUnitChange}
                      aria-label="Max size units input"
                    >
                      <FormSelectOption key="1" value="1" label="B" />
                      <FormSelectOption key="2" value={1024} label="KiB" />
                      <FormSelectOption key="3" value={1024*1024} label="MiB" />
                    </FormSelect>
                  </SplitItem>
              </Split>
            </FormGroup>
            <FormGroup
              label="Maximum Age"
              fieldId="maxAge"
              helperText="The maximum age of recording data retained in the target application's recording buffer."
            >
              <Split hasGutter={true}>
                <SplitItem isFilled>
                  <TextInput
                    value={maxAge}
                    isRequired
                    type="number"
                    id="maxAgeDuration"
                    aria-label="Max age duration"
                    onChange={handleMaxAgeChange}
                    min="0"
                  />
                </SplitItem>
                <SplitItem>
                  <FormSelect
                    value={maxAgeUnits}
                    onChange={handleMaxAgeUnitChange}
                    aria-label="Max Age units Input"
                  >
                    <FormSelectOption key="1" value="1" label="Seconds" />
                    <FormSelectOption key="2" value={60} label="Minutes" />
                    <FormSelectOption key="3" value={60*60} label="Hours" />
                  </FormSelect>
                </SplitItem>
              </Split>
            </FormGroup>
            <FormGroup
              label="Archival Period"
              fieldId="archivalPeriod"
              helperText="Time between copies of active recording data being pulled into Cryostat archive storage."
            >
              <Split hasGutter={true}>
                <SplitItem isFilled>
                  <TextInput
                    value={archivalPeriod}
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
                    onChange={handleArchivalPeriodUnitsChange}
                    aria-label="archival period units input"
                  >
                    <FormSelectOption key="1" value="1" label="Seconds" />
                    <FormSelectOption key="2" value={60} label="Minutes" />
                    <FormSelectOption key="3" value={60*60} label="Hours" />
                  </FormSelect>
                </SplitItem>
              </Split>
            </FormGroup>
            <FormGroup
              label="Preserved Archives"
              fieldId="preservedArchives"
              helperText="The number of archived recording copies to preserve in archives for each target application affected by this rule."
            >
              <TextInput
                value={preservedArchives}
                isRequired
                type="number"
                id="preservedArchives"
                aria-label="prserved archives"
                onChange={handleSetPreservedArchives}
                min="0"
              />
            </FormGroup>
            <ActionGroup>
              <Button variant="primary" onClick={handleSubmit} isDisabled={nameValid !== ValidatedOptions.success || !template || !templateType || !matchExpression}>Create</Button>
              <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
            </ActionGroup>
          </Form>
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export const CreateRule = withRouter(Comp);
