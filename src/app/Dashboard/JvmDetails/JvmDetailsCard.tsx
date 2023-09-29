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

import { NodeType, Target } from '@app/Shared/Services/api.types';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NodeAction } from '@app/Topology/Actions/types';
import EntityDetails from '@app/Topology/Entity/EntityDetails';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { CardActions, CardBody, CardHeader } from '@patternfly/react-core';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { DashboardCard } from '../DashboardCard';
import { DashboardCardDescriptor, DashboardCardFC, DashboardCardSizes, DashboardCardTypeProps } from '../types';
import '@app/Topology/styles/base.css';

export interface JvmDetailsCardProps extends DashboardCardTypeProps {}

export const JvmDetailsCard: DashboardCardFC<JvmDetailsCardProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [target, setTarget] = React.useState<Target>();

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(setTarget));
  }, [addSubscription, context.target, context.api, setTarget]);

  const wrappedTarget = React.useMemo(() => {
    if (!target) {
      return undefined;
    }
    return {
      getData: () => ({
        name: target.alias,
        target,
        nodeType: NodeType.JVM,
        labels: {},
      }),
    };
  }, [target]);

  const actionFilter = React.useCallback((action: NodeAction): boolean => {
    return action.key !== 'VIEW_DASHBOARD';
  }, []);

  return (
    <DashboardCard
      id={`${props.dashboardId}`}
      cardSizes={JvmDetailsCardSizes}
      isCompact
      cardHeader={
        <CardHeader>
          <CardActions>{...props.actions || []}</CardActions>
        </CardHeader>
      }
      style={props.isFullHeight ? {} : { height: '36em' }} // FIXME: Remove after implementing height resizing
      {...props}
    >
      <CardBody>
        <EntityDetails entity={wrappedTarget} actionFilter={actionFilter} />
      </CardBody>
    </DashboardCard>
  );
};

JvmDetailsCard.cardComponentName = 'JvmDetailsCard';

export const JvmDetailsCardSizes: DashboardCardSizes = {
  span: {
    minimum: 4,
    default: 4,
    maximum: 12,
  },
  height: {
    // TODO: implement height resizing
    minimum: Number.NaN,
    default: Number.NaN,
    maximum: Number.NaN,
  },
};

export const JvmDetailsCardDescriptor: DashboardCardDescriptor = {
  featureLevel: FeatureLevel.PRODUCTION,
  title: 'JvmDetailsCard.CARD_TITLE',
  cardSizes: JvmDetailsCardSizes,
  description: 'JvmDetailsCard.CARD_DESCRIPTION',
  descriptionFull: `JvmDetailsCard.CARD_DESCRIPTION_FULL`,
  component: JvmDetailsCard,
  propControls: [],
  icon: <ContainerNodeIcon />,
  labels: [
    {
      content: 'Info',
      color: 'blue',
    },
  ],
  preview: <JvmDetailsCard span={12} isDraggable={false} isFullHeight={false} isResizable={false} dashboardId={0} />,
};
