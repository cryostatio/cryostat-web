import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { filter, first, map } from 'rxjs/operators';
import { ActionGroup, Button, Checkbox, Form, FormGroup, FormSelect, FormSelectOption, FormSelectOptionGroup, TextArea, TextInput, Split, SplitItem, Text, TextVariants, Tooltip, TooltipPosition } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { AlertVariant } from '@patternfly/react-core';
import { EventTemplate } from './CreateRecording';

export interface CustomRecordingFormProps {
  onSubmit: (command: string, args: string[]) => void;
};

export const RecordingNamePattern = /^[\w_]+$/;
export const TemplatePattern = /^template=([\w]+)$/;
export const EventSpecifierPattern = /([\w\\.\$]+):([\w]+)=([\w\\d\.]+)/;

export const CustomRecordingForm = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const history = useHistory();

  const [recordingName, setRecordingName] = React.useState(props.recordingName || props?.location?.state?.recordingName || '');
  const [nameValid, setNameValid] = React.useState(false);
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);
  const [durationUnit, setDurationUnit] = React.useState(1);
  const [templates, setTemplates] = React.useState([] as EventTemplate[]);
  const [template, setTemplate] = React.useState(props.template || props?.location?.state?.template ||  '');
  const [eventSpecifiers, setEventSpecifiers] = React.useState(props?.eventSpecifiers?.join(' ') || '');
  const [eventsValid, setEventsValid] = React.useState(!!props.template || !!props?.location?.state?.template);

  React.useEffect(() => {
    console.log('CustomRecordingForm', { props });
  }, []);

  const handleContinuousChange = (checked, evt) => {
    setContinuous(evt.target.checked);
  };

  const handleDurationChange = (evt) => {
    setDuration(Number(evt));
  };

  const handleDurationUnitChange = (evt) => {
    setDurationUnit(Number(evt));
  };

  const handleTemplateChange = (name) => {
    setEventsValid(!!name);
    setEventSpecifiers('');
    setTemplate(name);
  };

  const handleEventSpecifiersChange = (evt) => {
    setEventsValid(TemplatePattern.test(evt) || EventSpecifierPattern.test(evt));
    setTemplate('');
    setEventSpecifiers(evt);
  };

  const getEventSpecifiers = () => !!template ? `template=${template}` : eventSpecifiers;

  const getEventString = () => !!template ? `template=${template}` : eventSpecifiers.split(/\s+/).filter(Boolean).join(',');

  const handleRecordingNameChange = (name) => {
    setNameValid(RecordingNamePattern.test(name));
    setRecordingName(name);
  };

  const handleSubmit = () => {
    const eventString = getEventString();

    let notificationMessages: string[] = [];
    if (!nameValid) {
      notificationMessages.push(`Recording name ${recordingName} is invalid`);
    }
    if (!eventsValid) {
      notificationMessages.push(`Event specifiers are invalid`);
    }
    if (notificationMessages.length > 0) {
      const message = notificationMessages.join('. ').trim() + '.';
      notifications.warning('Invalid form data', message);
      return;
    }

    const command = continuous ? 'start' : 'dump';
    const args = [recordingName];
    if (!continuous) {
      const eventDuration = continuous ? 0 : duration * durationUnit;
      args.push(String(eventDuration));
    }
    args.push(eventString);
    props.onSubmit(command, args);
  };

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('list-event-templates')
      .pipe(
        filter(m => m.status === 0),
        map(m => m.payload),
      )
      .subscribe(m => setTemplates(m));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    context.commandChannel.sendMessage('list-event-templates');
  }, []);

  React.useEffect(() => {
    if (TemplatePattern.test(eventSpecifiers)) {
      const regexMatches = TemplatePattern.exec(eventSpecifiers);
      if (!regexMatches || !regexMatches[1]) {
        return;
      }
      const template = regexMatches[1];
      if (!!templates.find(t => t.name === template)) {
        handleTemplateChange(template);
      }
    }
  }, [eventSpecifiers, templates]);

  return (<>
    <Text component={TextVariants.small}>
      JDK Flight Recordings are compact records of events which have occurred within the target JVM.
      Many event types are built-in to the JVM itself, while others are user-defined.
    </Text>
    <Form isHorizontal>
      <FormGroup
        label="Name"
        isRequired
        fieldId="recording-name"
        helperText="Please enter a recording name. This will be unique within the target JVM."
        isValid={nameValid}
      >
        <TextInput
          value={recordingName}
          isRequired
          type="text"
          id="recording-name"
          aria-describedby="recording-name-helper"
          onChange={handleRecordingNameChange}
          isValid={nameValid}
        />
      </FormGroup>
      <FormGroup
        label="Duration"
        isRequired
        fieldId="recording-duration"
      >
        <Checkbox
          label="Continuous"
          isChecked={continuous}
          onChange={handleContinuousChange}
          aria-label="Continuous checkbox"
          id="recording-continuous"
          name="recording-continuous"
        />
        <Split gutter="md">
          <SplitItem isFilled>
            <TextInput
              value={duration}
              isRequired
              type="number"
              id="recording-duration"
              aria-describedby="recording-duration-helper"
              onChange={handleDurationChange}
              isDisabled={continuous}
              min="0"
            />
          </SplitItem>
          <SplitItem>
            <FormSelect
              value={durationUnit}
              onChange={handleDurationUnitChange}
              aria-label="Duration Units Input"
              isDisabled={continuous}
            >
              <FormSelectOption key="1" value="1" label="Seconds" />
              <FormSelectOption key="2" value={60} label="Minutes" />
              <FormSelectOption key="3" value={60*60}label="Hours" />
            </FormSelect>
          </SplitItem>
        </Split>
      </FormGroup>
      <FormGroup
        label="Events"
        isRequired
        fieldId="recording-events"
        isValid={eventsValid}
        helperText="Select a template from the dropdown, or enter a template name or event specifier string in the text area."
      >
        <Split gutter="md">
          <SplitItem>
            <FormSelect
              value={template}
              onChange={handleTemplateChange}
              aria-label="Event Template Input"
            >
              <FormSelectOption key="0" value="" label="Custom Event Definition" />
              <FormSelectOptionGroup key="1" label="Remote Templates">
                {
                  templates.map((t: EventTemplate, idx: number) => (<FormSelectOption key={idx+2} value={t.name} label={t.name} />))
                }
              </FormSelectOptionGroup>
            </FormSelect>
          </SplitItem>
          <SplitItem>
            <Tooltip
              isContentLeftAligned
              position={TooltipPosition.auto}
              content={
                <Text component={TextVariants.p}>
                  Templates are selected with the syntax <i>template=Foo</i>.<br /><br />

                  Event names and options are specified with the syntax <i>ns.Event:option=Value</i>
                  &mdash; ex. <i>jdk.SocketRead:enabled=true</i>.<br /><br />

                Multiple event option specifiers should be separated by whitespace.
                </Text>
              }
            >
              <OutlinedQuestionCircleIcon />
            </Tooltip>
          </SplitItem>
          <SplitItem isFilled>
            <TextArea value={getEventSpecifiers()} onChange={handleEventSpecifiersChange} aria-label="Custom Event Specifiers Area" isValid={eventsValid} />
          </SplitItem>
        </Split>
      </FormGroup>
      <ActionGroup>
        <Button variant="primary" onClick={handleSubmit}>Create</Button>
        <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
      </ActionGroup>
    </Form>
  </>);
}
