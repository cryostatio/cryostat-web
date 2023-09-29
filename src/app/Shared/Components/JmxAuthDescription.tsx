import { Text, TextContent, TextList, TextListItem, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { DescriptionProps } from './types';

export const JmxAuthDescription: React.FC<React.PropsWithChildren<DescriptionProps>> = ({ children }) => {
  return (
    <TextContent>
      {children}
      <Text component={TextVariants.p}>
        JVM applications may be configured to require clients, such as Cryostat, to pass a challenge based
        authentication before establishing a connection.
      </Text>
      <Text component={TextVariants.p}>
        Check the deployment configuration of your JVM application for system properties such as:
      </Text>
      <TextList>
        <TextListItem>
          <Text component={TextVariants.pre}>com.sun.management.jmxremote.authenticate</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>com.sun.management.jmxremote.password.file</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>com.sun.management.jmxremote.login.config</Text>
        </TextListItem>
      </TextList>
    </TextContent>
  );
};
