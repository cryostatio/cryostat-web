import * as React from 'react';
import { Card, CardBody, CardHeader, Text, TextVariants } from '@patternfly/react-core';
import { DisconnectedIcon } from '@patternfly/react-icons';

export const NoTargetSelected: React.FunctionComponent = () => {

  return (<>
    <Card>
      <CardHeader>
        <Text component={TextVariants.h4}>
          <DisconnectedIcon />
          &nbsp;
          No Target Selected
        </Text>
      </CardHeader>
      <CardBody>
        <Text component={TextVariants.p}>
          Select a JVM target to view this content.
        </Text>
      </CardBody>
    </Card>
  </>);

};
