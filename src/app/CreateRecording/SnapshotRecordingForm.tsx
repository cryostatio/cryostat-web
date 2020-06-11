import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { ActionGroup, Button, Form, Text, TextVariants } from '@patternfly/react-core';
import { useHistory } from 'react-router-dom';

export interface SnapshotRecordingFormProps {
  onSubmit: (command: string, args: string[]) => void;
}

export const SnapshotRecordingForm = (props) => {
  const context = React.useContext(ServiceContext);
  const history = useHistory();
  const [target, setTarget] = React.useState('');

  React.useEffect(() => {
    const sub = context.commandChannel.target().subscribe(setTarget);
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  const handleSubmit = () => {
    props.onSubmit('snapshot', []);
  };

  return (<>
    <Form>
      <Text component={TextVariants.p}>
        A Snapshot recording is one which contains all information about all
        events that have been captured in the current session by <i>other,&nbsp;
        non-snapshot</i> recordings. Snapshots do not themselves define which
        events are enabled, their thresholds, or any other options. A Snapshot
        is only ever in the STOPPED state from the moment it is created.
      </Text>
      <ActionGroup>
        <Button variant="primary" isDisabled={!target} onClick={handleSubmit}>Create</Button>
        <Button variant="secondary" onClick={history.goBack}>Cancel</Button>
      </ActionGroup>
    </Form>
  </>);
}
