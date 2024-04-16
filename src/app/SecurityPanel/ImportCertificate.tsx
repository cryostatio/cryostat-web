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

import { JmxSslDescription } from '@app/Shared/Components/JmxSslDescription';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  List,
  ListItem,
  Panel,
  PanelMain,
  PanelMainBody,
  Popover,
  Text,
  TextContent,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { SecurityCard } from './types';

export const CertificateImport: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [certs, setCerts] = React.useState([] as string[]);

  React.useEffect(() => {
    addSubscription(context.api.doGet('tls/certs', 'v3').subscribe(setCerts));
  }, [addSubscription, context.api, setCerts]);

  return (
    <Panel isScrollable>
      <PanelMain>
        <PanelMainBody>
          {certs.length ? (
            <List isPlain isBordered>
              {certs.map((cert) => (
                <ListItem key={cert}>
                  <Label>{cert}</Label>
                </ListItem>
              ))}
            </List>
          ) : (
            <EmptyState variant={EmptyStateVariant.xs}>
              <Title headingLevel="h4" size="md">
                No certificates
              </Title>
              <EmptyStateBody>No additional certificates are loaded.</EmptyStateBody>
            </EmptyState>
          )}
        </PanelMainBody>
      </PanelMain>
    </Panel>
  );
};

export const ListCertificates: SecurityCard = {
  key: 'ssl',
  title: (
    <Text>
      Imported SSL Certificates
      <Popover maxWidth="40rem" headerContent="JMX over SSL" bodyContent={<JmxSslDescription />}>
        <Button variant="plain">
          <OutlinedQuestionCircleIcon />
        </Button>
      </Popover>
    </Text>
  ),
  description: (
    <TextContent>
      <Text component={TextVariants.small}>
        The following certificates are present in Cryostat&apos;s additional trust store. Contact your Cryostat
        administrator if your application requires a new trusted certificate. You must restart the Cryostat server to
        reload the certificate store after adding new certificates.
      </Text>
    </TextContent>
  ),
  content: CertificateImport,
};
