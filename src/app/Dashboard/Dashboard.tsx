import * as React from 'react';
import { PageSection, Title } from '@patternfly/react-core';
import { CommandChannel } from '@app/Shared/Services/CommandChannel.service';

export class Dashboard extends React.Component {

  private cmdChan: CommandChannel | null = null;

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.cmdChan = new CommandChannel();
  }

  render() {
    return (
      <PageSection>
        <Title size="lg">Dashboard Page Title</Title>
      </PageSection>
    );
  }

}
