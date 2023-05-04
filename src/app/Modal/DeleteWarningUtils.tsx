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
  description: `If you click delete, the rule will be disabled.`,
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
];

export const getFromWarningMap = (warning: DeleteOrDisableWarningType): DeleteOrDisableWarning | undefined => {
  const wt = DeleteWarningKinds.find((t) => t.id === warning);
  return wt;
};
