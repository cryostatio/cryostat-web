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
export enum DeleteOrDisableWarningType {
  DeleteActiveRecordings = 'DeleteActiveRecordings',
  DeleteArchivedRecordings = 'DeleteArchivedRecordings',
  DeleteAutomatedRules = 'DeleteAutomatedRules',
  DisableAutomatedRules = 'DisableAutomatedRules',
  DeleteEventTemplates = 'DeleteEventTemplates',
  DeleteProbeTemplates = 'DeleteProbeTemplates',
  DeleteActiveProbes = 'DeleteActiveProbes',
  DeleteCredentials = 'DeleteCredentials',
  DeleteCustomTargets = 'DeleteCustomTargets',
  DeleteDashboardLayout = 'DeleteDashboardLayout',
  DeleteLayoutTemplate = 'DeleteLayoutTemplate',
  ClearDashboardLayout = 'ClearDashboardLayout',
}

export interface DeleteOrDisableWarning {
  id: DeleteOrDisableWarningType;
  title: string;
  label: string;
  description: string;
  ariaLabel: string;
}

export const DeleteActiveRecordings: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteActiveRecordings,
  title: 'Permanently delete your JFR recording?',
  label: 'Delete Active Recording',
  description: `If you click delete, recording and report data will be lost.`,
  ariaLabel: 'Recording delete warning',
};

export const DeleteArchivedRecordings: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteArchivedRecordings,
  title: 'Permanently delete your archived JFR recording?',
  label: 'Delete Archived Recording',
  description: `If you click delete, recording and report data will be lost.`,
  ariaLabel: 'Recording delete warning',
};

export const DeleteAutomatedRules: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteAutomatedRules,
  title: 'Permanently delete your Automated Rule?',
  label: 'Delete Automated Rule',
  description: `If you click delete, rule data will be lost.`,
  ariaLabel: 'Automated rule delete warning',
};

export const DisableAutomatedRules: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DisableAutomatedRules,
  title: 'Disable your Automated Rule?',
  label: 'Disable Automated Rule',
  description: `If you click Disable, the rule will be disabled.`,
  ariaLabel: 'Automated rule disable warning',
};

export const DeleteEventTemplates: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteEventTemplates,
  title: 'Permanently delete your Event Template?',
  label: 'Delete Event Template',
  description: `If you click delete, custom event template data will be lost.`,
  ariaLabel: 'Event template delete warning',
};

export const DeleteProbeTemplates: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteProbeTemplates,
  title: 'Permanently delete your Probe Template?',
  label: 'Delete Probe Template',
  description: `If you click delete, custom probe template data will be lost.`,
  ariaLabel: 'Probe template delete warning',
};

export const DeleteActiveProbes: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteActiveProbes,
  title: 'Permanently remove your Active Probes from the target?',
  label: 'Remove Active Probes',
  description: `If you click delete, active probes will be removed from the target.`,
  ariaLabel: 'Active Probes remove warning',
};

export const DeleteCredentials: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteCredentials,
  title: 'Permanently delete your Credentials?',
  label: 'Delete Credentials',
  description: `If you click delete, credential data for this target will be lost.`,
  ariaLabel: 'Credentials delete warning',
};

export const DeleteCustomTargets: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteCustomTargets,
  title: 'Permanently delete your Custom Target?',
  label: 'Delete Custom Targets',
  description: `If you click delete, custom target information will be lost.`,
  ariaLabel: 'Custom Targets delete warning',
};

export const DeleteDashboardLayout: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteDashboardLayout,
  title: 'Permanently delete your Dashboard Layout?',
  label: 'Delete Dashboard Layouts',
  description: `If you click delete, dashboard layout configuration data will be lost.`,
  ariaLabel: 'Dashboard Layout delete warning',
};

export const ClearDashboardLayout: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.ClearDashboardLayout,
  title: 'Permanently clear your Dashboard Layout?',
  label: 'Clear Dashboard Layout',
  description: 'If you click clear, all cards in the current dashboard layout will be removed.',
  ariaLabel: 'Dashboard Layout clear warning',
};

export const DeleteLayoutTemplate: DeleteOrDisableWarning = {
  id: DeleteOrDisableWarningType.DeleteLayoutTemplate,
  title: 'Permanently delete your Layout Template?',
  label: 'Delete Layout Template',
  description: `If you click delete, layout template configuration data will be lost.`,
  ariaLabel: 'Layout Template delete warning',
};

export const DeleteWarningKinds: DeleteOrDisableWarning[] = [
  DeleteActiveRecordings,
  DeleteArchivedRecordings,
  DeleteAutomatedRules,
  DisableAutomatedRules,
  DeleteEventTemplates,
  DeleteProbeTemplates,
  DeleteActiveProbes,
  DeleteCredentials,
  DeleteCustomTargets,
  DeleteDashboardLayout,
  DeleteLayoutTemplate,
  ClearDashboardLayout,
];
