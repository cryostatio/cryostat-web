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

import { Button } from '@patternfly/react-core';
import * as React from 'react';
import { CertificateUploadModal } from './CertificateUploadModal';
import { SecurityCard } from './SecurityPanel';

const Component = () => {
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
  title: 'Import SSL Certificates',
  description: 'The Cryostat server must be restarted in order to reload the certificate store.',
  content: Component,
};
