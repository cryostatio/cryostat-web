import * as React from 'react';
import { PageSection, Title } from '@patternfly/react-core';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';

export class Dashboard extends React.Component {

  render() {
    return (
      <PageSection>
        <Title size="lg">Dashboard</Title>
        <TargetSelect />
      </PageSection>
    );
  }

}
