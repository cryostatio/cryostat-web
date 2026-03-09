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
import { Content, ContentVariants } from '@patternfly/react-core';
import * as React from 'react';
import { DescriptionProps } from './types';

export const JmxSslDescription: React.FC<React.PropsWithChildren<DescriptionProps>> = ({ children }) => {
  return (
    <Content>
      {children}
      <Content component={ContentVariants.p}>
        JVM applications can be configured to present an SSL/TLS certificate for incoming JMX connections. Clients, such
        as Cryostat, should be configured to trust these certificates so that the origin and authenticity of the
        connection data can be verified.
      </Content>
      <Content component={ContentVariants.p}>
        Check the deployment configuration of your JVM application for system properties such as:
      </Content>
      <Content component="ul">
        <Content component="li">
          <Content component={ContentVariants.pre}>javax.net.ssl.keyStore</Content>
        </Content>
        <Content component="li">
          <Content component={ContentVariants.pre}>javax.net.ssl.keyStorePassword</Content>
        </Content>
        <Content component="li">
          <Content component={ContentVariants.pre}>com.sun.management.jmxremote.ssl.need.client.auth</Content>
        </Content>
        <Content component="li">
          <Content component={ContentVariants.pre}>javax.net.ssl.trustStore</Content>
        </Content>
        <Content component="li">
          <Content component={ContentVariants.pre}>javax.net.ssl.trustStorePassword</Content>
        </Content>
        <Content component="li">
          <Content component={ContentVariants.pre}>com.sun.management.jmxremote.registry.ssl</Content>
        </Content>
      </Content>
    </Content>
  );
};
