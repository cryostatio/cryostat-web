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
import CreateRecording from '@app/CreateRecording/CreateRecording';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { portalRoot } from '@app/utils/utils';
import { Card, CardBody, Modal, ModalVariant } from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { ActiveRecordingsTable } from './ActiveRecordingsTable';

export const Recordings: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const navigate = useNavigate();
  const location = useLocation();
  const addSubscription = useSubscriptions();
  const [archiveEnabled, setArchiveEnabled] = React.useState(false);
  const [createRecordingModalOpen, setCreateRecordingModalOpen] = React.useState(false);

  React.useEffect(() => {
    const state = location.state as Record<string, unknown> | null;
    const hasCreateRecordingPrefill =
      !!state &&
      (state.openCreateModal === true ||
        !!state.template ||
        state.name !== undefined ||
        state.labels !== undefined ||
        state.continuous !== undefined ||
        state.restart !== undefined ||
        state.duration !== undefined ||
        state.maxAge !== undefined ||
        state.maxSize !== undefined ||
        state.skipDurationCheck !== undefined);
    if (hasCreateRecordingPrefill) {
      setCreateRecordingModalOpen(true);
    }
  }, [location.state]);

  const closeCreateRecordingModal = React.useCallback(() => {
    setCreateRecordingModalOpen(false);
    if (location.state) {
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    }
  }, [navigate, location.pathname, location.search, location.hash, location.state]);

  React.useEffect(() => {
    addSubscription(context.api.isArchiveEnabled().subscribe((v) => setArchiveEnabled(v)));
  }, [addSubscription, context.api, setArchiveEnabled]);

  return (
    <TargetView pageTitle="Recordings">
      <Card isCompact>
        <CardBody>
          <ActiveRecordingsTable archiveEnabled={archiveEnabled} />
        </CardBody>
      </Card>
      <Modal
        appendTo={portalRoot}
        isOpen={createRecordingModalOpen}
        variant={ModalVariant.large}
        title="Create Recording"
        onClose={closeCreateRecordingModal}
      >
        {createRecordingModalOpen ? <CreateRecording embedded onClose={closeCreateRecordingModal} /> : null}
      </Modal>
    </TargetView>
  );
};

export default Recordings;
