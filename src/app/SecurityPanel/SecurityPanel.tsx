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
import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { Card, CardBody, CardTitle, Text, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { StoreCredentialsCard } from './Credentials/StoreCredentials';
import { ImportCertificate } from './ImportCertificate';

export interface SecurityPanelProps {}

export const SecurityPanel: React.FC<SecurityPanelProps> = (_) => {
  const securityCards = [ImportCertificate, StoreCredentialsCard].map((c) => ({
    title: c.title,
    description: c.description,
    element: React.createElement(c.content, null),
  }));

  return (
    <BreadcrumbPage pageTitle="Security">
      {securityCards.map((s) => (
        <Card key={s.title}>
          <CardTitle>
            <Text component={TextVariants.h1}>{s.title}</Text>
            <Text component={TextVariants.small}>{s.description}</Text>
          </CardTitle>
          <CardBody>{s.element}</CardBody>
        </Card>
      ))}
    </BreadcrumbPage>
  );
};

export default SecurityPanel;

export interface SecurityCard {
  title: string;
  description: JSX.Element | string;
  content: React.FC;
}
