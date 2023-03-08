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
  ArchivedRecording,
  EventProbe,
  Recording,
  StoredCredential,
  UPLOADS_SUBDIRECTORY,
} from '@app/Shared/Services/Api.service';
import { NotificationCategory, NotificationMessage } from '@app/Shared/Services/NotificationChannel.service';
import { Link } from 'react-router-dom';
import { concatMap, defaultIfEmpty, forkJoin, map, Observable, of } from 'rxjs';
import { TargetNode } from '../../typings';

export type ResourceTypes = Recording | EventTemplate | EventType | EventProbe | Rule | StoredCredential;

// Note: Values will be word split to used as display names
export const TargetOwnedResourceTypeAsArray = [
  'activeRecordings',
  'archivedRecordings',
  'archivedUploadRecordings',
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
      return apiService.doGet<ActiveRecording[]>(
        `targets/${encodeURIComponent(target.connectUrl)}/recordings`,
        'v1',
        undefined,
        true,
        true
      );
    case 'archivedRecordings':
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return apiService
        .graphql<any>(
          `
              query ArchivedRecordingsForTarget($connectUrl: String) {
                archivedRecordings(filter: { sourceTarget: $connectUrl }) {
                  data {
                    name
                    downloadUrl
                    reportUrl
                    metadata {
                      labels
                    }
                    size
                  }
                }
              }`,
          { connectUrl: target.connectUrl },
          true,
          true
        )
        .pipe(map((v) => v.data.archivedRecordings.data as ArchivedRecording[]));
    case 'archivedUploadRecordings':
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      return apiService
        .graphql<any>(
          `query UploadedRecordings($filter: ArchivedRecordingFilterInput){
                  archivedRecordings(filter: $filter) {
                    data {
                      name
                      downloadUrl
                      reportUrl
                      metadata {
                        labels
                      }
                      size
                    }
                  }
                }`,
          { filter: { sourceTarget: UPLOADS_SUBDIRECTORY } },
          true,
          true
        )
        .pipe(map((v) => v.data.archivedRecordings.data as ArchivedRecording[]));
    case 'eventTemplates':
      return apiService.doGet<EventTemplate[]>(
        `targets/${encodeURIComponent(target.connectUrl)}/templates`,
        'v1',
        undefined,
        true,
        true
      );
    case 'eventTypes':
      return apiService.doGet<EventType[]>(
        `targets/${encodeURIComponent(target.connectUrl)}/events`,
        'v1',
        undefined,
        true,
        true
      );
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
            map((rules) => rules.reduce((prev, curr) => prev.concat(curr)))
          );
        })
      );
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export const getResourceAddedEvent = (resourceType: TargetOwnedResourceType | TargetRelatedResourceType) => {
  switch (resourceType) {
    case 'activeRecordings':
      return [NotificationCategory.ActiveRecordingCreated, NotificationCategory.SnapshotCreated];
    case 'archivedRecordings':
      return [NotificationCategory.ArchivedRecordingCreated, NotificationCategory.ActiveRecordingSaved];
    case 'archivedUploadRecordings':
      return [NotificationCategory.ArchivedRecordingCreated];
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

export const getResourceRemovedEvent = (resourceType: TargetOwnedResourceType | TargetRelatedResourceType) => {
  switch (resourceType) {
    case 'activeRecordings':
      return [NotificationCategory.ActiveRecordingDeleted, NotificationCategory.SnapshotDeleted];
    case 'archivedRecordings':
      return [NotificationCategory.ArchivedRecordingDeleted];
    case 'archivedUploadRecordings':
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

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type PatchFn = (arr: ResourceTypes[], eventData: any, removed?: boolean) => Observable<ResourceTypes[]>;

export const getResourceListPatchFn = (
  resourceType: TargetOwnedResourceType | TargetRelatedResourceType,
  { target }: TargetNode,
  apiService: ApiService
): PatchFn => {
  switch (resourceType) {
    case 'activeRecordings':
    case 'archivedRecordings':
    case 'archivedUploadRecordings':
      return (arr: Recording[], eventData: any, removed?: boolean) => {
        const recording: Recording = eventData.message.recording;
        let newArr = arr.filter((r) => r.name !== recording.name);
        if (!removed) {
          newArr = newArr.concat([recording]);
        }
        return of(newArr);
      };
    case 'eventTemplates':
      return (arr: EventTemplate[], eventData: any, removed?: boolean) => {
        const template: EventTemplate = eventData.message.template;
        let newArr = arr.filter((r) => r.name !== template.name);
        if (!removed) {
          newArr = newArr.concat([template]);
        }
        return of(newArr);
      };
    case 'agentProbes':
      return (arr: EventProbe[], eventData: any, removed?: boolean) => {
        // Only support remove all
        if (removed) {
          return of([]);
        }
        const probes = (eventData.message.events as EventProbe[]) || [];
        const probeIds = probes.map((p) => p.id);
        return of([...arr.filter((probe) => !probeIds.includes(probe.id)), ...probes]);
      };
    case 'automatedRules':
      return (arr: Rule[], eventData: any, removed?: boolean) => {
        const rule: Rule = eventData.message;

        return apiService.isTargetMatched(rule.matchExpression, target).pipe(
          map((ok) => {
            if (ok) {
              // return apiService.isTargetMatched(credential.matchExpression, )
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
      return (arr: StoredCredential[], eventData: any, removed?: boolean) => {
        const credential: StoredCredential = eventData.message;

        return apiService.isTargetMatched(credential.matchExpression, target).pipe(
          map((ok) => {
            if (ok) {
              // return apiService.isTargetMatched(credential.matchExpression, )
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
      return { to: { pathname: '/recordings', state: { tab: 'active' } } };
    case 'archivedRecordings':
      return { to: { pathname: '/recordings', state: { tab: 'archived' } } };
    case 'archivedUploadRecordings':
      return { to: { pathname: '/archives', state: { tab: 'uploads' } } };
    case 'eventTemplates':
      return { to: { pathname: '/events', state: { eventTab: 'templates' } } };
    case 'eventTypes':
      return { to: { pathname: '/events', state: { eventTab: 'types' } } };
    case 'agentProbes':
      return { to: { pathname: '/events', state: { agentTab: 'probes' } } };
    case 'automatedRules':
      return { to: { pathname: '/rules' } };
    case 'credentials':
      return { to: { pathname: '/security' } };
    default:
      throw new Error(`Unsupported resource: ${resourceType}`);
  }
};

export const extraTargetConnectUrlFromEvent = (event: NotificationMessage): string | undefined => {
  return event.message.target || event.message.targetId;
};
