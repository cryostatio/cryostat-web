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
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { TargetDiscoveryEvent, Target, NotificationCategory } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSort } from '@app/utils/hooks/useSort';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, sortResources } from '@app/utils/utils';
import { EmptyState, EmptyStateIcon, Title } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import {
  InnerScrollContainer,
  SortByDirection,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import _ from 'lodash';
import * as React from 'react';

export interface MatchedTargetsTableProps {
  id: number;
  matchExpression: string;
}

const tableColumns: TableColumn[] = [
  {
    title: 'Target',
    keyPaths: ['alias'],
    transform: (_alias: string, target: Target) => {
      return target.alias === target.connectUrl || !target.alias
        ? `${target.connectUrl}`
        : `${target.alias} (${target.connectUrl})`;
    },
    sortable: true,
  },
];

export const MatchedTargetsTable: React.FC<MatchedTargetsTableProps> = ({ id, matchExpression }) => {
  const context = React.useContext(ServiceContext);

  const [targets, setTargets] = React.useState([] as Target[]);
  const [sortBy, getSortParams] = useSort();
  const [isLoading, setIsLoading] = React.useState(false);
  const addSubscription = useSubscriptions();

  const refreshTargetsList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.api.getCredential(id).subscribe((v) => {
        setTargets(v.targets);
        setIsLoading(false);
      }),
    );
  }, [addSubscription, setIsLoading, context.api, setTargets, id]);

  React.useEffect(() => {
    refreshTargetsList();
  }, [refreshTargetsList]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TargetJvmDiscovery).subscribe((v) => {
        const evt: TargetDiscoveryEvent = v.message.event;
        const target: Target = evt.serviceRef;
        if (evt.kind === 'FOUND') {
          const match: boolean = eval(matchExpression);
          if (match) {
            setTargets((old) => old.concat(target));
          }
        } else if (evt.kind === 'LOST') {
          setTargets((old) => old.filter((o) => !_.isEqual(o, target)));
        }
      }),
    );
  }, [addSubscription, context, context.notificationChannel, setTargets, matchExpression]);

  const targetRows = React.useMemo(() => {
    return sortResources(
      {
        index: sortBy.index ?? 0,
        direction: sortBy.direction ?? SortByDirection.asc,
      },
      targets,
      tableColumns,
    ).map((target, idx) => {
      return (
        <Tr key={`target-${idx}`}>
          <Td key={`target-table-row-${idx}_0`}>
            {target.alias == target.connectUrl || !target.alias
              ? `${target.connectUrl}`
              : `${target.alias} (${target.connectUrl})`}
          </Td>
        </Tr>
      );
    });
  }, [targets, sortBy]);

  let view: JSX.Element;
  if (isLoading) {
    view = <LoadingView />;
  } else if (targets.length === 0) {
    view = (
      <>
        <EmptyState>
          <EmptyStateIcon icon={SearchIcon} />
          <Title headingLevel="h4" size="lg">
            No Targets
          </Title>
        </EmptyState>
      </>
    );
  } else {
    view = (
      <>
        <InnerScrollContainer style={{ maxHeight: '24em' }}>
          <TableComposable aria-label="matched-targets-table" isStickyHeader={true} variant={'compact'}>
            <Thead>
              <Tr>
                {tableColumns.map(({ title }, index) => (
                  <Th key={`table-header-${title}`} sort={getSortParams(index)}>
                    {title}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{targetRows}</Tbody>
          </TableComposable>
        </InnerScrollContainer>
      </>
    );
  }

  return <>{view}</>;
};
