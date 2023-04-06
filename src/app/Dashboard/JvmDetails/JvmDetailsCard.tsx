/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { Target } from '@app/Shared/Services/Target.service';
import { NodeAction } from '@app/Topology/Actions/NodeActions';
import EntityDetails from '@app/Topology/Shared/Entity/EntityDetails';
import { NodeType } from '@app/Topology/typings';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { CardActions, CardBody, CardHeader } from '@patternfly/react-core';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { DashboardCardDescriptor, DashboardCardProps, DashboardCardSizes } from '../Dashboard';
import { DashboardCard } from '../DashboardCard';
import '@app/Topology/styles/base.css';

export interface JvmDetailsCardProps extends DashboardCardProps {}

export const JvmDetailsCard: React.FC<JvmDetailsCardProps> = (props) => {
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
      {...props}
    >
      <CardBody
        // FIXME: Remove after implementing height resizing
        style={{ height: '36em' }}
      >
        <EntityDetails entity={wrappedTarget} actionFilter={actionFilter} />
      </CardBody>
    </DashboardCard>
  );
};

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
};
