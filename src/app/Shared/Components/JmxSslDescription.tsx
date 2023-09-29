import { Text, TextContent, TextList, TextListItem, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { DescriptionProps } from './types';

export const JmxSslDescription: React.FC<React.PropsWithChildren<DescriptionProps>> = ({ children }) => {
  return (
    <TextContent>
      {children}
      <Text component={TextVariants.p}>
        JVM applications can be configured to present an SSL certificate for incoming JMX connections. Clients, such as
        Cryostat, should be configured to trust these certificates so that the origin and authenticity of the connection
        data can be verified.
      </Text>
      <Text component={TextVariants.p}>
        Check the deployment configuration of your JVM application for system properties such as:
      </Text>
      <TextList>
        <TextListItem>
          <Text component={TextVariants.pre}>javax.net.ssl.keyStore</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>javax.net.ssl.keyStorePassword</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>com.sun.management.jmxremote.ssl.need.client.auth</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>javax.net.ssl.trustStore</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>javax.net.ssl.trustStorePassword</Text>
        </TextListItem>
        <TextListItem>
          <Text component={TextVariants.pre}>com.sun.management.jmxremote.registry.ssl</Text>
        </TextListItem>
      </TextList>
    </TextContent>
  );
};
