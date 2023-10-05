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
import { Button, Icon, Text, TextContent, TextVariants, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { CertificateUploadModal } from './CertificateUploadModal';
import { SecurityCard } from './types';

export const CertificateImport: React.FC = () => {
  const [showModal, setShowModal] = React.useState(false);

  const handleModalClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <Button variant="primary" aria-label="import" onClick={() => setShowModal(true)}>
        Upload
      </Button>
      <CertificateUploadModal visible={showModal} onClose={handleModalClose} />
    </>
  );
};

export const ImportCertificate: SecurityCard = {
  key: 'ssl',
  title: (
    <Text>
      Import SSL Certificates{' '}
      <Tooltip
        isContentLeftAligned
        maxWidth="40rem"
        content={
          <JmxSslDescription>
            <Text component={TextVariants.h3}>JMX over SSL</Text>
          </JmxSslDescription>
        }
      >
        <Icon isInline>
          <OutlinedQuestionCircleIcon />
        </Icon>
      </Tooltip>
    </Text>
  ),
  description: (
    <TextContent>
      <Text component={TextVariants.small}>Add SSL certificates to the Cryostat server truststore.</Text>
      <Text component={TextVariants.small}>
        The Cryostat server must be restarted in order to reload the certificate store.
      </Text>
    </TextContent>
  ),
  content: CertificateImport,
};
