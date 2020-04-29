import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { filter, first, map } from 'rxjs/operators';
import { ActionGroup, Breadcrumb, BreadcrumbHeading, BreadcrumbItem, Button, Card, CardBody, CardHeader, Checkbox, Form, FormGroup, FormSelect, FormSelectOption, FormSelectOptionGroup, TextArea, TextInput, PageSection, Split, SplitItem, Text, TextVariants, Title } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface CreateRecordingProps {
  recordingName?: string;
  template?: string;
  eventSpecifiers?: string[];
}

export const RecordingNamePattern = /^[a-zA-Z0-9_-]+$/;

export const CreateRecording = (props: CreateRecordingProps) => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();

  const [recordingName, setRecordingName] = React.useState(props.recordingName || '');
  const [nameValid, setNameValid] = React.useState(false);
  const [continuous, setContinuous] = React.useState(false);
  const [duration, setDuration] = React.useState(30);
  const [durationUnit, setDurationUnit] = React.useState(1);
  const [templates, setTemplates] = React.useState([]);
  const [template, setTemplate] = React.useState('');
  const [eventSpecifiers, setEventSpecifiers] = React.useState('');

  const handleContinuousChange = (checked, evt) => {
    setContinuous(evt.target.checked);
  };

  const handleDurationChange = (evt) => {
    setDuration(Number(evt));
  };

  const handleDurationUnitChange = (evt) => {
    setDurationUnit(Number(evt));
  };

  const handleEventSpecifiersChange = (evt) => {
    setTemplate('');
    setEventSpecifiers(evt);
  };

  const getEventSpecifiers = () => !!template ? template : eventSpecifiers;

  const getEventString = () => !!template ? template : eventSpecifiers.split(/\s+/).filter(Boolean).join(',');

  const handleRecordingNameChange = (name) => {
    setNameValid(RecordingNamePattern.test(name));
    setRecordingName(name);
  };

  const handleSubmit = () => {
    const eventString = getEventString();
    if (!nameValid || !eventString) {
      // TODO tell user what's invalid
      // TODO validate eventString properly
      return;
    }
    const command = continuous ? 'start' : 'dump';
    const id = context.commandChannel.createMessageId();
    context.commandChannel.onResponse(command).pipe(
      filter(m => m.id === id),
      filter(m => m.status === 0), // TODO inform the user if the request fails
      first(),
      )
      .subscribe(() => history.push('/recordings'));
    const args = [recordingName];
    if (!continuous) {
      const eventDuration = continuous ? 0 : duration * durationUnit;
      args.push(String(eventDuration));
    }
    args.push(eventString);
    context.commandChannel.sendMessage(command, args, id);
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

  return (
    <PageSection>
      <Breadcrumb>
        <BreadcrumbItem to="/recordings">Recordings</BreadcrumbItem>
        <BreadcrumbHeading>Create</BreadcrumbHeading>
      </Breadcrumb>
      <Card>
        <CardBody>
          <Text component={TextVariants.p}>Create Flight Recording</Text>
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
            >
              <Split gutter="md">
                <SplitItem>
                  <FormSelect
                    value={template}
                    onChange={setTemplate}
                    aria-label="Event Template Input"
                  >
                    <FormSelectOption key="0" value="" label="Custom Event Definition" />
                    <FormSelectOptionGroup key="1" label="Remote Templates">
                      {
                        templates.map(({ name }: { name: string }, idx: number) => (<FormSelectOption key={idx+2} value={`template=${name}`} label={name} />))
                      }
                    </FormSelectOptionGroup>
                  </FormSelect>
                </SplitItem>
                <SplitItem isFilled>
                  <TextArea value={getEventSpecifiers()} onChange={handleEventSpecifiersChange} aria-label="Custom Event Specifiers Area" />
                </SplitItem>
              </Split>
            </FormGroup>
            <ActionGroup>
              <Button variant="primary" onClick={handleSubmit}>Create</Button>
              <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
            </ActionGroup>
          </Form>
        </CardBody>
      </Card>
    </PageSection>
  );

};
