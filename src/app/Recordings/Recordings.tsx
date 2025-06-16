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
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetView } from '@app/TargetView/TargetView';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { Card, CardBody } from '@patternfly/react-core';
import * as React from 'react';
import { ActiveRecordingsTable } from './ActiveRecordingsTable';

export const Recordings: React.FC = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [archiveEnabled, setArchiveEnabled] = React.useState(false);

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
    </TargetView>
  );
};

export default Recordings;
