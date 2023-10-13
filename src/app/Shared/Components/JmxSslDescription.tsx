/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
