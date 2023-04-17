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
import { EventTemplate } from '@app/CreateRecording/CreateRecording';
import { EventType } from '@app/Events/EventTypes';
import { Rule } from '@app/Rules/Rules';
import {
  ActiveRecording,
  ApiService,
  EventProbe,
  Recording,
  RecordingState,
  StoredCredential,
} from '@app/Shared/Services/Api.service';
import { NotificationCategory, NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Bullseye,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTermHelpText,
  DescriptionListTermHelpTextButton,
  Flex,
  FlexItem,
  Label,
  LabelProps,
  Popover,
} from '@patternfly/react-core';
import { BanIcon, RunningIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  catchError,
  combineLatest,
  concatMap,
  defaultIfEmpty,
  forkJoin,
  interval,
  map,
  merge,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { TargetNode } from '../../typings';
import { EmptyText } from '../EmptyText';

export type DescriptionConfig = {
  key: React.Key;
  title: React.ReactNode;
  helperTitle: React.ReactNode;
  helperDescription: React.ReactNode;
  content: React.ReactNode;
};

export const mapSection = (d: DescriptionConfig) => (
  <DescriptionListGroup key={d.key}>
    <DescriptionListTermHelpText>
      <Popover headerContent={d.helperTitle} bodyContent={d.helperDescription}>
        <DescriptionListTermHelpTextButton>{d.title}</DescriptionListTermHelpTextButton>
      </Popover>
    </DescriptionListTermHelpText>
    <DescriptionListDescription style={{ userSelect: 'text', cursor: 'text' }}>{d.content}</DescriptionListDescription>
  </DescriptionListGroup>
);

export type ResourceTypes = Recording | EventTemplate | EventType | EventProbe | Rule | StoredCredential;

// Note: Values will be word split to used as display names
export const TargetOwnedResourceTypeAsArray = [
  'activeRecordings',
  'archivedRecordings',
  'eventTemplates',
  'eventTypes',
  'agentProbes',
] as const;

export const TargetRelatedResourceTypeAsArray = ['automatedRules', 'credentials'] as const;

export type TargetOwnedResourceType = (typeof TargetOwnedResourceTypeAsArray)[number];

export type TargetRelatedResourceType = (typeof TargetRelatedResourceTypeAsArray)[number];

export const isOwnedResource = (resourceType: TargetOwnedResourceType | TargetRelatedResourceType) => {
  return resourceType !== 'automatedRules' && resourceType !== 'credentials';
};

export const getTargetOwnedResources = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
  { target }: TargetNode,
  apiService: ApiService
): Observable<ResourceTypes[]> => {
  switch (resourceType) {
    case 'activeRecordings':
      return apiService.getTargetActiveRecordings(target);
    case 'archivedRecordings':
      return apiService.getTargetArchivedRecordings(target);
    case 'eventTemplates':
      return apiService.getTargetEventTemplates(target);
    case 'eventTypes':
      return apiService.getTargetEventTypes(target);
    case 'agentProbes':
      return apiService.getActiveProbesForTarget(target, true, true);
    case 'automatedRules':
      return apiService.getRules(true, true).pipe(
        concatMap((rules) => {
          const tasks = rules.map((r) =>
            apiService.isTargetMatched(r.matchExpression, target).pipe(map((ok) => (ok ? [r] : [])))
          );
          return forkJoin(tasks).pipe(
            defaultIfEmpty([[] as Rule[]]),
            map((rules) => rules.reduce((prev, curr) => prev.concat(curr)))
          );
        })
      );
    case 'credentials':
      return apiService.getCredentials(true, true).pipe(
        concatMap((credentials) => {
          const tasks = credentials.map((crd) =>
            apiService.isTargetMatched(crd.matchExpression, target).pipe(map((ok) => (ok ? [crd] : [])))
          );
          return forkJoin(tasks).pipe(
            defaultIfEmpty([[] as StoredCredential[]]),
            map((credentials) => credentials.reduce((prev, curr) => prev.concat(curr)))
          );
        })
      );
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export const getResourceAddedOrModifiedEvents = (resourceType: TargetOwnedResourceType | TargetRelatedResourceType) => {
  switch (resourceType) {
    case 'activeRecordings':
      return [
        NotificationCategory.ActiveRecordingCreated,
        NotificationCategory.SnapshotCreated,
        NotificationCategory.ActiveRecordingStopped, // State Update
      ];
    case 'archivedRecordings':
      return [NotificationCategory.ArchivedRecordingCreated, NotificationCategory.ActiveRecordingSaved];
    case 'eventTemplates':
      return [NotificationCategory.TemplateUploaded];
    case 'eventTypes':
      return [];
    case 'agentProbes':
      return [NotificationCategory.ProbeTemplateApplied];
    case 'automatedRules':
      return [NotificationCategory.RuleCreated, NotificationCategory.RuleUpdated];
    case 'credentials':
      return [NotificationCategory.CredentialsStored, NotificationCategory.TargetCredentialsStored];
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export const getResourceRemovedEvents = (resourceType: TargetOwnedResourceType | TargetRelatedResourceType) => {
  switch (resourceType) {
    case 'activeRecordings':
      return [NotificationCategory.ActiveRecordingDeleted, NotificationCategory.SnapshotDeleted];
    case 'archivedRecordings':
      return [NotificationCategory.ArchivedRecordingDeleted];
    case 'eventTemplates':
      return [NotificationCategory.TemplateDeleted];
    case 'eventTypes':
      return [];
    case 'agentProbes':
      return [NotificationCategory.ProbesRemoved];
    case 'automatedRules':
      return [NotificationCategory.RuleDeleted];
    case 'credentials':
      return [NotificationCategory.CredentialsDeleted, NotificationCategory.TargetCredentialsDeleted];
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export type PatchFn = (
  arr: ResourceTypes[],
  eventData: NotificationMessage,
  removed?: boolean
) => Observable<ResourceTypes[]>;

export const getResourceListPatchFn = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
  { target }: TargetNode,
  apiService: ApiService
): PatchFn => {
  switch (resourceType) {
    case 'activeRecordings':
    case 'archivedRecordings':
      return (arr: Recording[], eventData: NotificationMessage, removed?: boolean) => {
        const recording: Recording = eventData.message.recording;
        let newArr = arr.filter((r) => r.name !== recording.name);
        if (!removed) {
          newArr = newArr.concat([recording]);
        }
        return of(newArr);
      };
    case 'eventTemplates':
      return (arr: EventTemplate[], eventData: NotificationMessage, removed?: boolean) => {
        const template: EventTemplate = eventData.message.template;
        let newArr = arr.filter((r) => r.name !== template.name);
        if (!removed) {
          newArr = newArr.concat([template]);
        }
        return of(newArr);
      };
    case 'agentProbes':
      return (arr: EventProbe[], eventData: NotificationMessage, removed?: boolean) => {
        // Only support remove all
        if (removed) {
          return of([]);
        }
        const probes = (eventData.message.events as EventProbe[]) || [];
        const probeIds = probes.map((p) => p.id);
        return of([...arr.filter((probe) => !probeIds.includes(probe.id)), ...probes]);
      };
    case 'automatedRules':
      return (arr: Rule[], eventData: NotificationMessage, removed?: boolean) => {
        const rule: Rule = eventData.message;

        return apiService.isTargetMatched(rule.matchExpression, target).pipe(
          map((ok) => {
            if (ok) {
              let newArr = arr.filter((r) => r.name !== rule.name);
              if (!removed) {
                newArr = newArr.concat([rule]);
              }
              return newArr;
            }
            return arr;
          })
        );
      };
    case 'credentials':
      return (arr: StoredCredential[], eventData: NotificationMessage, removed?: boolean) => {
        const credential: StoredCredential = eventData.message;

        return apiService.isTargetMatched(credential.matchExpression, target).pipe(
          map((ok) => {
            if (ok) {
              let newArr = arr.filter((r) => r.id !== credential.id);
              if (!removed) {
                newArr = newArr.concat([credential]);
              }
              return newArr;
            }
            return arr;
          })
        );
      };
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

// TODO: Revisit when updating to react-router v6
export const getLinkPropsForTargetResource = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType
): React.ComponentProps<Link> => {
  switch (resourceType) {
    case 'activeRecordings':
      return { to: { pathname: '/recordings', search: '?tab=active-recording' } };
    case 'archivedRecordings':
      return { to: { pathname: '/recordings', search: '?tab=archived-recording' } };
    case 'eventTemplates':
      return { to: { pathname: '/events', search: '?eventTab=event-template' } };
    case 'eventTypes':
      return { to: { pathname: '/events', search: '?eventTab=event-type' } };
    case 'agentProbes':
      return { to: { pathname: '/events', search: '?agentTab=agent-probe' } };
    case 'automatedRules':
      return { to: { pathname: '/rules' } };
    case 'credentials':
      return { to: { pathname: '/security' } };
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export const ActiveRecDetail: React.FC<{ resources: ActiveRecording[] }> = ({ resources, ...props }) => {
  const stateGroupConfigs = React.useMemo(
    () => [
      {
        groupLabel: 'Running',
        color: 'green',
        icon: <RunningIcon color="green" />,
        items: resources.filter((rec) => rec.state === RecordingState.RUNNING),
      },
      {
        groupLabel: 'Stopped',
        color: 'orange',
        icon: <BanIcon color="orange" />,
        items: resources.filter((rec) => rec.state === RecordingState.STOPPED),
      },
    ],
    [resources]
  );

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTermHelpText>Recording Status</DescriptionListTermHelpText>
        <DescriptionListDescription>
          <Flex {...props}>
            {stateGroupConfigs.map(({ groupLabel, items, color, icon }) => (
              <Flex key={groupLabel}>
                <FlexItem spacer={{ default: 'spacerSm' }}>
                  <span style={{ fontSize: '1.1em' }}>{items.length}</span>
                </FlexItem>
                <FlexItem>
                  <Label icon={icon} color={color as LabelProps['color']}>
                    {groupLabel}
                  </Label>
                </FlexItem>
              </Flex>
            ))}
          </Flex>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

export const Nothing: React.FC<{ resources: ResourceTypes[] }> = () => {
  return (
    <Bullseye>
      <EmptyText text={'Nothing to show.'} />
    </Bullseye>
  );
};

export const getExpandedResourceDetails = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType
): React.FC<{ resources: ResourceTypes[] }> => {
  switch (resourceType) {
    case 'activeRecordings':
      return ActiveRecDetail;
    default:
      return Nothing;
  }
};

export const getConnectUrlFromEvent = (event: NotificationMessage): string | undefined => {
  return event.message.target || event.message.targetId;
};

export const useResources = <R = ResourceTypes,>(
  targetNode: TargetNode,
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType
): { resources: R[]; error?: Error; loading?: boolean } => {
  const { api, notificationChannel, settings } = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [resources, setResources] = React.useState<ResourceTypes[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error>();

  const targetSubjectRef = React.useRef(new Subject<TargetNode>());
  const targetSubject = targetSubjectRef.current;

  React.useEffect(() => {
    addSubscription(
      targetSubject
        .pipe(
          switchMap((tn) => {
            const resourceObs = getTargetOwnedResources(resourceType, tn, api).pipe(
              map((rs: ResourceTypes[]) => ({
                resources: rs,
                error: undefined,
              })),
              catchError((err: Error) =>
                of({
                  resources: [],
                  error: err,
                })
              )
            );
            if (!settings.autoRefreshEnabled()) {
              return resourceObs;
            }
            return merge(
              resourceObs,
              interval(settings.autoRefreshPeriod() * settings.autoRefreshUnits()).pipe(concatMap(() => resourceObs))
            );
          })
        )
        .subscribe(({ resources, error }) => {
          setLoading(false);
          setError(error);
          setResources(resources);
        })
    );
  }, [addSubscription, setLoading, setError, setResources, api, settings, targetSubject, resourceType]);

  React.useEffect(() => {
    const patchEventConfig = [
      {
        categories: getResourceAddedOrModifiedEvents(resourceType),
      },
      {
        categories: getResourceRemovedEvents(resourceType),
        deleted: true,
      },
    ];

    patchEventConfig.forEach(({ categories, deleted }) => {
      addSubscription(
        targetSubject
          .pipe(
            switchMap((tn) =>
              combineLatest([of(tn), merge(...categories.map((cat) => notificationChannel.messages(cat)))])
            )
          )
          .subscribe(([targetNode, event]) => {
            const extractedUrl = getConnectUrlFromEvent(event);
            const isOwned = isOwnedResource(resourceType);
            if (!isOwned || (extractedUrl && extractedUrl === targetNode.target.connectUrl)) {
              setLoading(true);
              setResources((old) => {
                // Avoid accessing state directly, which
                // causes the effect to run every time
                addSubscription(
                  getResourceListPatchFn(resourceType, targetNode, api)(old, event, deleted).subscribe({
                    next: (rs) => {
                      setLoading(false);
                      setError(undefined);
                      setResources(rs);
                    },
                    error: (error) => {
                      setLoading(false);
                      setError(error);
                    },
                  })
                );
                return old;
              });
            }
          })
      );
    });
  }, [addSubscription, setLoading, api, targetSubject, resourceType, notificationChannel, setResources, setError]);

  // Need to call after registering listeners
  // Do not reorder
  React.useEffect(() => {
    targetSubject.next(targetNode);
  }, [targetNode, targetSubject]);

  return {
    error: error,
    loading: loading,
    resources: resources as R[],
  };
};
