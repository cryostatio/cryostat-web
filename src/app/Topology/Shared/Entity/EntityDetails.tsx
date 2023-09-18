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

import { LinearDotSpinner } from '@app/Shared/LinearDotSpinner';
import { PropertyPath } from '@app/Shared/PropertyPath';
import { MBeanMetrics, MBeanMetricsResponse } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { ActionDropdown, NodeAction } from '@app/Topology/Actions/NodeActions';
import useDayjs from '@app/utils/useDayjs';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { formatBytes, hashCode, portalRoot, splitWordsOnUppercase } from '@app/utils/utils';
import {
  Alert,
  AlertActionCloseButton,
  Badge,
  Bullseye,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  Divider,
  ExpandableSection,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { ExpandableRowContent, TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { GraphElement, NodeStatus } from '@patternfly/react-topology';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { catchError, concatMap, map, of } from 'rxjs';
import { isRenderable } from '../../GraphView/UtilsFactory';
import { EnvironmentNode, isTargetNode, TargetNode } from '../../typings';
import { EmptyText } from '../EmptyText';
import { actionFactory, getStatusTargetNode, ListElement, nodeTypeToAbbr, StatusExtra } from '../utils';
import { EntityAnnotations } from './EntityAnnotations';
import { EntityKeyValues, valuesEntryTransformer } from './EntityKeyValues';
import { EntityTitle } from './EntityTitle';
import { TargetPaths } from './TargetPaths';
import {
  DescriptionConfig,
  getExpandedResourceDetails,
  getLinkPropsForTargetResource,
  mapSection,
  Nothing,
  TargetOwnedResourceType,
  TargetOwnedResourceTypeAsArray,
  TargetRelatedResourceType,
  TargetRelatedResourceTypeAsArray,
  useResources,
} from './utils';

export interface EntityDetailsProps {
  entity?: GraphElement | ListElement;
  columnModifier?: React.ComponentProps<typeof DescriptionList>['columnModifier'];
  className?: string;
  alertOptions?: AlertOptions;
  actionFilter?: (_: NodeAction) => boolean;
}

enum EntityTab {
  DETAIL = 'detail',
  RESOURCE = 'resource',
}

export const EntityDetails: React.FC<EntityDetailsProps> = ({
  entity,
  className,
  columnModifier,
  actionFilter,
  alertOptions,
  ...props
}) => {
  const [activeTab, setActiveTab] = React.useState(EntityTab.DETAIL);
  const viewContent = React.useMemo(() => {
    if (entity && isRenderable(entity)) {
      const data: EnvironmentNode | TargetNode = entity.getData();
      const isTarget = isTargetNode(data);
      const titleContent = isTarget ? data.target.alias : data.name;

      const _actions = actionFactory(entity, 'dropdownItem', actionFilter);

      return (
        <>
          <EntityDetailHeader
            titleContent={titleContent}
            alertOptions={alertOptions}
            badge={nodeTypeToAbbr(data.nodeType)}
            badgeTooltipContent={data.nodeType}
            status={isTarget ? getStatusTargetNode(data) : []}
            actionDropdown={
              _actions.length ? <ActionDropdown actions={_actions} className={'entity-overview__action-menu'} /> : null
            }
          />
          <Divider />
          <Tabs activeKey={activeTab} onSelect={(_, tab: string) => setActiveTab(tab as EntityTab)}>
            <Tab eventKey={EntityTab.DETAIL} title={<TabTitleText>Details</TabTitleText>}>
              <div className="entity-overview__wrapper">
                {isTarget ? (
                  <TargetDetails targetNode={data} columnModifier={columnModifier} />
                ) : (
                  <GroupDetails envNode={data} columnModifier={columnModifier} />
                )}
              </div>
            </Tab>
            <Tab eventKey={EntityTab.RESOURCE} title={<TabTitleText>{'Resources'}</TabTitleText>}>
              <div className="entity-overview__wrapper">
                {isTarget ? <TargetResources targetNode={data} /> : <GroupResources envNode={data} />}
              </div>
            </Tab>
          </Tabs>
        </>
      );
    }
    return null;
  }, [entity, setActiveTab, activeTab, columnModifier, actionFilter, alertOptions]);
  return (
    <div {...props} className={css('entity-overview', className)}>
      {viewContent}
    </div>
  );
};

export const constructHelperDescription = (description: React.ReactNode, kind: string, path: string | string[]) => {
  return (
    <Stack hasGutter>
      <StackItem>{description}</StackItem>
      <StackItem>
        <PropertyPath kind={kind} path={path} />
      </StackItem>
    </Stack>
  );
};

export const TargetDetails: React.FC<{
  targetNode: TargetNode;
  columnModifier?: React.ComponentProps<typeof DescriptionList>['columnModifier'];
}> = ({ targetNode, columnModifier, ...props }) => {
  const serviceRef = React.useMemo(() => targetNode.target, [targetNode]);
  const [isExpanded, setExpanded] = React.useState(false);

  const _transformedData = React.useMemo((): DescriptionConfig[] => {
    return [
      {
        key: 'Connection URL',
        title: 'Connection URL',
        helperTitle: 'Connection URL',
        helperDescription: constructHelperDescription('JMX Service URL.', 'Target', ['connectUrl']),
        content: serviceRef.connectUrl,
      },
      {
        key: 'Alias',
        title: 'Alias',
        helperTitle: 'Alias',
        helperDescription: constructHelperDescription(
          'Connection Nickname (same as Connection URL if not specified).',
          'Target',
          ['alias'],
        ),
        content: serviceRef.alias,
      },
      {
        key: 'JVM ID',
        title: (
          <>
            <span style={{ marginRight: '0.5em' }}>JVM ID</span>
            {!serviceRef.jvmId && (
              <Tooltip content={'Failed to compute JVM ID'}>
                <ExclamationTriangleIcon color="orange" />
              </Tooltip>
            )}
          </>
        ),
        helperTitle: (
          <>
            <span style={{ marginRight: '0.5em' }}>JVM ID</span>
            {!serviceRef.jvmId && (
              <Tooltip content={'Failed to compute JVM ID'}>
                <ExclamationTriangleIcon color="orange" />
              </Tooltip>
            )}
          </>
        ),
        helperDescription: constructHelperDescription('The ID of the current JVM.', 'Target', ['jvmId']),
        content: serviceRef.jvmId || <EmptyText text="No JVM ID" />,
      },
      {
        key: 'Labels',
        title: 'Labels',
        helperTitle: 'Labels',
        helperDescription: constructHelperDescription(
          'Map of string keys and values that can be used to organize and categorize targets.',
          'Target',
          ['labels'],
        ),
        content: <EntityKeyValues kv={serviceRef.labels} maxDisplay={3} />,
      },
      {
        key: 'Annotations',
        title: 'Annotations',
        helperTitle: 'Annotations',
        helperDescription: constructHelperDescription(
          'Annotations is an unstructured key value map stored with a target that may be set by external tools.',
          'Target',
          ['annotations'],
        ),
        content: <EntityAnnotations annotations={serviceRef.annotations} maxDisplay={3} />,
      },
    ];
  }, [serviceRef]);

  const onToggle = React.useCallback(() => setExpanded((v) => !v), [setExpanded]);

  return (
    <>
      <DescriptionList {...props} columnModifier={columnModifier}>
        {_transformedData.map(mapSection)}
      </DescriptionList>
      <ExpandableSection
        toggleText={isExpanded ? 'Show less' : 'Show more'}
        onToggle={onToggle}
        isExpanded={isExpanded}
      >
        <MBeanDetails isExpanded={isExpanded} connectUrl={serviceRef.connectUrl} columnModifier={columnModifier} />
      </ExpandableSection>
    </>
  );
};

const MBeanDetails: React.FC<{
  isExpanded: boolean;
  connectUrl: string;
  columnModifier?: React.ComponentProps<typeof DescriptionList>['columnModifier'];
}> = ({ isExpanded, connectUrl, columnModifier }) => {
  const context = React.useContext(ServiceContext);
  const [dayjs, dateTimeFormat] = useDayjs();
  const addSubscription = useSubscriptions();
  const [mbeanMetrics, setMbeanMetrics] = React.useState({} as MBeanMetrics);

  React.useEffect(() => {
    if (isExpanded) {
      addSubscription(
        context.api
          .graphql<MBeanMetricsResponse>(
            `
            query MBeanMXMetricsForTarget($connectUrl: String) {
              targetNodes(filter: { name: $connectUrl }) {
                mbeanMetrics {
                  runtime {
                    startTime
                    vmVendor
                    vmVersion
                    classPath
                    libraryPath
                    inputArguments
                    systemProperties
                  }
                  os {
                    name
                    version
                    arch
                    availableProcessors
                    totalPhysicalMemorySize
                    totalSwapSpaceSize
                  }
                }
              }
            }`,
            { connectUrl },
          )
          .pipe(
            map((resp) => resp.data.targetNodes[0].mbeanMetrics || {}),
            catchError((_) => of({})),
          )
          .subscribe(setMbeanMetrics),
      );
    }
  }, [isExpanded, addSubscription, connectUrl, context.api, setMbeanMetrics]);

  const _collapsedData = React.useMemo((): DescriptionConfig[] => {
    return [
      {
        key: 'Start Time',
        title: 'Start Time',
        helperTitle: 'Start Time',
        helperDescription: 'The time when this JVM process started.',
        content:
          (mbeanMetrics?.runtime?.startTime || 0) > 0 ? (
            dayjs(mbeanMetrics?.runtime?.startTime)
              .tz(dateTimeFormat.timeZone.full)
              .format('LLLL')
          ) : (
            <EmptyText text="Unknown start time" />
          ),
      },
      {
        key: 'JVM Version',
        title: 'JVM Version',
        helperTitle: 'JVM Version',
        helperDescription: 'The version of the JVM.',
        content: mbeanMetrics.runtime?.vmVersion || <EmptyText text="Unknown JVM version" />,
      },
      {
        key: 'JVM Vendor',
        title: 'JVM Vendor',
        helperTitle: 'JVM Vendor',
        helperDescription: 'The vendor who supplied this JVM',
        content: mbeanMetrics.runtime?.vmVendor || <EmptyText text="Unknown JVM vendor" />,
      },
      {
        key: 'Operating System Name',
        title: 'Operating System Name',
        helperTitle: 'Operating System Name',
        helperDescription: 'The name of the host system.',
        content: mbeanMetrics.os?.name || <EmptyText text="Unknown operating system name" />,
      },
      {
        key: 'Operating System Architecture',
        title: 'Operating System Architecture',
        helperTitle: 'Operating System Architecture',
        helperDescription: 'The CPU architecture of the host system.',
        content: mbeanMetrics.os?.arch || <EmptyText text="Unknown operating system architecture" />,
      },
      {
        key: 'Operating System Version',
        title: 'Operating System Version',
        helperTitle: 'Operating System Version',
        helperDescription: 'The version of the host operating system.',
        content: mbeanMetrics.os?.version || <EmptyText text="Unknown operating system version" />,
      },
      {
        key: 'Available Processors',
        title: 'Available Processors',
        helperTitle: 'Available Processors',
        helperDescription: 'The count of total processors available to the JVM process on its host.',
        content: mbeanMetrics.os?.availableProcessors || <EmptyText text="Unknown number of processors" />,
      },
      {
        key: 'Total Physical Memory',
        title: 'Total Physical Memory',
        helperTitle: 'Total Physical Memory',
        helperDescription: 'The total amount of physical memory of the host operating system.',
        content: mbeanMetrics.os?.totalPhysicalMemorySize ? (
          formatBytes(mbeanMetrics.os?.totalPhysicalMemorySize)
        ) : (
          <EmptyText text="Unknown amount of physical memory" />
        ),
      },
      {
        key: 'Total Swap Space',
        title: 'Total Swap Space',
        helperTitle: 'Total Swap Space',
        helperDescription: 'The total amount of swap space of the host operating system.',
        content: mbeanMetrics.os?.totalSwapSpaceSize ? (
          formatBytes(mbeanMetrics.os?.totalSwapSpaceSize)
        ) : (
          <EmptyText text="Unknown amount of swap space" />
        ),
      },
      {
        key: 'Class Path',
        title: 'Class Path',
        helperTitle: 'JVM Class Path',
        helperDescription: 'The list of class path locations for this JVM',
        content: (
          <EntityKeyValues kv={mbeanMetrics.runtime?.classPath?.split(':')} transformer={valuesEntryTransformer} />
        ),
      },
      {
        key: 'Library Paths',
        title: 'Library Paths',
        helperTitle: 'JVM Library Paths',
        helperDescription: 'The list of library path locations for this JVM',
        content: (
          <EntityKeyValues kv={mbeanMetrics.runtime?.libraryPath?.split(':')} transformer={valuesEntryTransformer} />
        ),
      },
      {
        key: 'Input Arguments',
        title: 'Input Arguments',
        helperTitle: 'JVM Input Arguments',
        helperDescription: 'The arguments passed to this JVM on startup',
        content: <EntityKeyValues kv={mbeanMetrics.runtime?.inputArguments} transformer={valuesEntryTransformer} />,
      },
      {
        key: 'System Properties',
        title: 'System Properties',
        helperTitle: 'JVM System Properties',
        helperDescription: 'The current system properties of this JVM',
        content: <EntityKeyValues kv={mbeanMetrics.runtime?.systemProperties} />,
      },
    ];
  }, [mbeanMetrics, dayjs, dateTimeFormat.timeZone.full]);

  return <DescriptionList columnModifier={columnModifier}>{_collapsedData.map(mapSection)}</DescriptionList>;
};

export const GroupDetails: React.FC<{
  envNode: EnvironmentNode;
  columnModifier?: React.ComponentProps<typeof DescriptionList>['columnModifier'];
}> = ({ envNode, columnModifier, ...props }) => {
  const _transformedData = React.useMemo(() => {
    return [
      {
        key: 'Name',
        title: 'Name',
        helperTitle: 'Name',
        helperDescription: 'Name of Realm (group) representing a target discovery mechanism.',
        content: envNode.name,
      },
      {
        key: 'Labels',
        title: 'Labels',
        helperTitle: 'Labels',
        helperDescription: 'Map of string keys and values that can be used to organize and categorize targets.',
        content: <EntityKeyValues kv={envNode.labels} />,
      },
    ];
  }, [envNode]);

  return (
    <DescriptionList {...props} columnModifier={columnModifier}>
      {_transformedData.map(mapSection)}
    </DescriptionList>
  );
};

export const TargetResources: React.FC<{ targetNode: TargetNode }> = ({ targetNode, ...props }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const target = targetNode.target;

  const [agentDetected, setAgentDetected] = React.useState(false);

  const checkIfAgentDetected = React.useCallback(() => {
    addSubscription(
      context.api
        .doGet(`targets/${encodeURIComponent(target.connectUrl)}/probes`, 'v2', undefined, true, true)
        .pipe(
          concatMap(() => of(true)),
          catchError(() => of(false)),
        )
        .subscribe(setAgentDetected),
    );
  }, [addSubscription, context.api, setAgentDetected, target]);

  React.useEffect(checkIfAgentDetected, [checkIfAgentDetected]);

  const tableConfigs = React.useMemo(
    () => [
      {
        title: 'Owned Resources',
        columns: ['Resource', 'Total'],
        rowData: TargetOwnedResourceTypeAsArray.filter((r) => agentDetected || r !== 'agentProbes'),
      },
      {
        title: 'Related Resources',
        columns: ['Resource', 'Matching Total'],
        rowData: TargetRelatedResourceTypeAsArray,
      },
    ],
    [agentDetected],
  );

  return (
    <Stack {...props} hasGutter>
      {tableConfigs.map(({ title, columns, rowData }) => (
        <StackItem key={title}>
          <Card isCompact isFlat isRounded>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardBody>
              <TableComposable variant="compact" borders={false}>
                <Thead>
                  <Tr>
                    <Th />
                    {columns.map((col, idx) => (
                      <Th key={col} textCenter={idx > 0}>
                        {col}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                {rowData.map((val) => (
                  <TargetResourceItem key={val} targetNode={targetNode} resourceType={val} />
                ))}
              </TableComposable>
            </CardBody>
          </Card>
        </StackItem>
      ))}
    </Stack>
  );
};

export const TargetResourceItem: React.FC<{
  targetNode: TargetNode;
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType;
}> = ({ targetNode, resourceType, ...props }) => {
  const services = React.useContext(ServiceContext);
  const { resources, error, loading } = useResources(targetNode, resourceType);

  const [expanded, setExpanded] = React.useState(false);

  const switchTarget = React.useCallback(
    () => services.target.setTarget(targetNode.target),
    [targetNode.target, services.target],
  );

  const ExpandedComponent = React.useMemo(() => {
    if (error || loading) {
      return Nothing;
    }
    return getExpandedResourceDetails(resourceType);
  }, [resourceType, error, loading]);

  return (
    <Tbody isExpanded={ExpandedComponent !== null && expanded}>
      <Tr {...props}>
        <Td
          expand={{
            rowIndex: hashCode(`${targetNode.name}-${resourceType}`),
            isExpanded: expanded,
            onToggle: () => setExpanded((old) => !old),
            expandId: `${targetNode.name}-${resourceType}-expanded-detail`,
          }}
        />
        <Td key={`${resourceType}-resource-name`} dataLabel={'Resource'}>
          {
            <Link {...getLinkPropsForTargetResource(resourceType)} onClick={switchTarget}>
              {splitWordsOnUppercase(resourceType, true).join(' ')}
            </Link>
          }
        </Td>
        <Td key={`${resourceType}-resource-count`} dataLabel={'Total'} textCenter>
          {loading ? (
            <Bullseye>
              <LinearDotSpinner />
            </Bullseye>
          ) : error ? (
            <Tooltip content={error.message} appendTo={portalRoot}>
              <WarningTriangleIcon color="var(--pf-global--warning-color--100)" />
            </Tooltip>
          ) : (
            <Badge>{resources.length}</Badge>
          )}
        </Td>
      </Tr>
      <Tr isExpanded={expanded}>
        <Td colSpan={3}>
          <ExpandableRowContent>
            <ExpandedComponent resources={resources} />
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

export const GroupResources: React.FC<{ envNode: EnvironmentNode }> = ({ envNode, ...props }) => {
  const contents = React.useMemo(() => {
    return envNode.children.map((child) => {
      const isTarget = isTargetNode(child);
      const [status, extra] = getStatusTargetNode(child);

      return (
        <Card isFlat isCompact key={child.name}>
          <CardBody>
            <Flex>
              <FlexItem flex={{ default: 'flex_1' }}>
                <Tooltip content={isTarget ? child.target.connectUrl : child.name} appendTo={portalRoot}>
                  <div>
                    <Badge>{nodeTypeToAbbr(child.nodeType)}</Badge>
                    <span style={{ marginLeft: '0.5em' }}>{isTarget ? child.target.alias : child.name}</span>
                  </div>
                </Tooltip>
              </FlexItem>
              {status === NodeStatus.warning ? (
                <FlexItem>
                  <Tooltip content={extra?.title} appendTo={portalRoot}>
                    <WarningTriangleIcon color="var(--pf-global--warning-color--100)" />
                  </Tooltip>
                </FlexItem>
              ) : null}
            </Flex>
          </CardBody>
        </Card>
      );
    });
  }, [envNode]);

  return (
    <Stack hasGutter {...props}>
      <StackItem key={0}>
        <span style={{ fontWeight: '700' }}>Number of children of this group:</span>
        <Badge style={{ marginLeft: '0.5em' }}>{envNode.children.length}</Badge>
      </StackItem>
      {contents.map((content, idx) => (
        <StackItem key={idx + 1}>{content}</StackItem>
      ))}
    </Stack>
  );
};

export interface AlertOptions {
  hideActions?: boolean;
}

export interface EntityDetailHeaderProps {
  titleContent: React.ReactNode;
  badgeTooltipContent?: React.ReactNode;
  badge?: ReturnType<typeof nodeTypeToAbbr>;
  actionDropdown?: React.ReactNode;
  status: [NodeStatus?, StatusExtra?];
  alertOptions?: AlertOptions;
}

export const EntityDetailHeader: React.FC<EntityDetailHeaderProps> = ({
  titleContent,
  badge,
  badgeTooltipContent,
  actionDropdown,
  status: statusContent,
  alertOptions = {},
  ...props
}) => {
  const [status, extra] = statusContent;
  const [showBanner, setShowBanner] = React.useState(true);
  return (
    <div className="entity-overview__header" {...props}>
      <Flex>
        <FlexItem flex={{ default: 'flex_1' }}>
          <EntityTitle content={titleContent} badge={badge} badgeTooltipContent={badgeTooltipContent} />
        </FlexItem>
        <FlexItem>{actionDropdown}</FlexItem>
      </Flex>
      {status && showBanner ? (
        <Alert
          variant={status}
          isInline
          title={extra?.title}
          className={'entity-overview__alert-banner'}
          actionClose={<AlertActionCloseButton onClose={() => setShowBanner(false)} />}
        >
          <Stack hasGutter>
            <StackItem key={'alert-description'}>{extra?.description}</StackItem>
            {extra?.callForAction && !alertOptions.hideActions ? (
              <StackItem key={'alert-call-for-action'}>
                <Flex>
                  {extra.callForAction.map((action, index) => (
                    <FlexItem key={index}>{action}</FlexItem>
                  ))}
                </Flex>
              </StackItem>
            ) : null}
          </Stack>
        </Alert>
      ) : null}
    </div>
  );
};

export default EntityDetails;
