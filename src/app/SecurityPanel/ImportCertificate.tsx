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
  Spinner,
  Text,
  TextContent,
  TextVariants,
  Title,
} from '@patternfly/react-core';
import { FileIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { TFunction } from 'i18next';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { tap } from 'rxjs/operators';
import { SecurityCard } from './types';

export const CertificateImport: React.FC = () => {
  const { t } = useTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [loading, setLoading] = React.useState(true);
  const [certs, setCerts] = React.useState([] as string[]);

  React.useEffect(() => {
    setLoading(true);
    addSubscription(
      context.api
        .doGet('tls/certs', 'v3')
        .pipe(tap((_) => setLoading(false)))
        .subscribe(setCerts),
    );
  }, [setLoading, addSubscription, context.api, setCerts]);

  return (
    <Panel isScrollable>
      <PanelMain>
        <PanelMainBody>
          {loading ? (
            <Spinner />
          ) : certs.length ? (
            <List isPlain isBordered>
              {certs.map((cert) => (
                <ListItem key={cert}>
                  <Label icon={<FileIcon />}>{cert}</Label>
                </ListItem>
              ))}
            </List>
          ) : (
            <EmptyState variant={EmptyStateVariant.xs}>
              <Title headingLevel="h4" size="md">
                {t('ImportCertificate.NO_CERTIFICATE_TITLE')}
              </Title>
              <EmptyStateBody>{t('ImportCertificate.NO_CERTIFICATE_BODY')}</EmptyStateBody>
            </EmptyState>
          )}
        </PanelMainBody>
      </PanelMain>
    </Panel>
  );
};

export const ListCertificates: SecurityCard = {
  key: 'ssl',
  title: (t: TFunction) => (
    <Text>
      {t('ImportCertificate.CARD_TITLE')}
      <Popover
        maxWidth="40rem"
        headerContent={t('ImportCertificate.CARD_TITLE_POPOVER_HEADER')}
        bodyContent={<JmxSslDescription />}
      >
        <Button variant="plain">
          <OutlinedQuestionCircleIcon />
        </Button>
      </Popover>
    </Text>
  ),
  description: (t: TFunction) => (
    <TextContent>
      <Text component={TextVariants.small}>{t('ImportCertificate.CARD_DESCRIPTION')}</Text>
    </TextContent>
  ),
  content: CertificateImport,
};
