import * as React from 'react';
import { Card, CardBody, CardHeader, PageSection, Text, TextVariants, Title } from '@patternfly/react-core';

export const CreateRecording = (props) => {

  return (
    <PageSection>
      <Title size="lg">Create Recording</Title>
      <Card>
        <CardBody>
          <Text component={TextVariants.p}>Create Recording View</Text>
        </CardBody>
      </Card>
    </PageSection>
  );

};
