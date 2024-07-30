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

import { ApiService } from '@app/Shared/Services/Api.service';
import {
  TargetNode,
  Rule,
  StoredCredential,
  NotificationCategory,
  NotificationMessage,
  Recording,
  EventTemplate,
  EventProbe,
} from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTermHelpText,
  DescriptionListTermHelpTextButton,
  Popover,
} from '@patternfly/react-core';
import * as React from 'react';
import { LinkProps } from 'react-router-dom';
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
import { ActiveRecDetail, Nothing } from './ResourceDetails';
import { DescriptionConfig, TargetOwnedResourceType, TargetRelatedResourceType, ResourceTypes, PatchFn } from './types';

export const keyValueEntryTransformer = (kv: { key: string; value: string }[]): string[] =>
  kv.map((k) => `${k.key}: ${k.value}`);

export const valuesEntryTransformer: (kv: string[] | object) => string[] = Object.values;

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

export const isOwnedResource = (resourceType: TargetOwnedResourceType | TargetRelatedResourceType) => {
  return resourceType !== 'automatedRules' && resourceType !== 'credentials';
};

export const getTargetOwnedResources = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
  { target }: TargetNode,
  apiService: ApiService,
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
            apiService.isTargetMatched(r.matchExpression, target).pipe(map((ok) => (ok ? [r] : []))),
          );
          return forkJoin(tasks).pipe(
            defaultIfEmpty([[] as Rule[]]),
            map((rules) => rules.reduce((prev, curr) => prev.concat(curr))),
          );
        }),
      );
    case 'credentials':
      return apiService.getCredentials(true, true).pipe(
        concatMap((credentials) => {
          const tasks = credentials.map((crd) =>
            apiService.isTargetMatched(crd.matchExpression, target).pipe(map((ok) => (ok ? [crd] : []))),
          );
          return forkJoin(tasks).pipe(
            defaultIfEmpty([[] as StoredCredential[]]),
            map((credentials) => credentials.reduce((prev, curr) => prev.concat(curr))),
          );
        }),
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

export const getResourceListPatchFn = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
  { target }: TargetNode,
  apiService: ApiService,
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
          }),
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
          }),
        );
      };
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export const getLinkPropsForTargetResource = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
): LinkProps => {
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

export const getExpandedResourceDetails = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
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
export const getJvmIdFromEvent = (event: NotificationMessage): string | undefined => {
  return event.message.jvmId;
};

export const useResources = <R = ResourceTypes,>(
  targetNode: TargetNode,
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
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
                }),
              ),
            );
            if (!settings.autoRefreshEnabled()) {
              return resourceObs;
            }
            return merge(
              resourceObs,
              interval(settings.autoRefreshPeriod() * settings.autoRefreshUnits()).pipe(concatMap(() => resourceObs)),
            );
          }),
        )
        .subscribe(({ resources, error }) => {
          setLoading(false);
          setError(error);
          setResources(resources);
        }),
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
              combineLatest([of(tn), merge(...categories.map((cat) => notificationChannel.messages(cat)))]),
            ),
          )
          .subscribe(([targetNode, event]) => {
            const extractedUrl = getConnectUrlFromEvent(event);
            const extractedJvmId = getJvmIdFromEvent(event);
            const isOwned = isOwnedResource(resourceType);
            if (
              !isOwned ||
              (extractedUrl && extractedUrl === targetNode.target.connectUrl) ||
              (extractedJvmId && extractedJvmId === targetNode.target.jvmId)
            ) {
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
                  }),
                );
                return old;
              });
            }
          }),
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
