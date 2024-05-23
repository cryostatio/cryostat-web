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

export const JmxAuthDescription: React.FC<React.PropsWithChildren<DescriptionProps>> = ({ children }) => {
  return (
    <TextContent>
      {children}
      <Text component={TextVariants.p}>
        JVM applications can be configured to require clients, such as Cryostat, to pass a challenge based
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
      <Text component={TextVariants.p}>
        These authentication credentials are stored in encrypted storage managed by the Cryostat backend and used for
        manually managing recordings and event templates on target JVMs, as well as for Automated Rules which run in the
        background and open unattended target connections.
      </Text>
    </TextContent>
  );
};
