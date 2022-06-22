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
export enum DeleteWarningEnum {
    DeleteActiveRecordings,
    DeleteArchivedRecordings,
    DeleteAutomatedRules,
    DeleteEventTemplates,
    DeleteJMXCredentials,
    DeleteUndefined
}

export interface DeleteWarningType {
    id: DeleteWarningEnum;
    title: string;
    description: string;
    ariaLabel: string;
}

export const DeleteActiveRecordings: DeleteWarningType = {
    id: DeleteWarningEnum.DeleteActiveRecordings,
    title: 'Delete Active Recording',
    description: `Delete Active Recording`,
    ariaLabel: "Recording delete warning"
}

export const DeleteArchivedRecordings: DeleteWarningType = {
    id: DeleteWarningEnum.DeleteArchivedRecordings,
    title: 'Delete Archived Recording',
    description: `Delete Archived Recording`,
    ariaLabel: "Recording delete warning"
}

export const DeleteAutomatedRules: DeleteWarningType = {
    id: DeleteWarningEnum.DeleteAutomatedRules,
    title: 'Delete Automated Rule',
    description: `Delete Automated Rule`,
    ariaLabel: "Automated rule delete warning"
}

export const DeleteEventTemplates: DeleteWarningType = {
    id: DeleteWarningEnum.DeleteEventTemplates,
    title: 'Delete Event Template',
    description: `Delete Event Template`,
    ariaLabel: "Event template delete warning"
}

export const DeleteJMXCredentials: DeleteWarningType = {
    id: DeleteWarningEnum.DeleteJMXCredentials,
    title: 'Delete JMX Credentials',
    description: `Delete JMX Credentials`,
    ariaLabel: "JMX Credential delete warning"
}

export const DeleteUndefined: DeleteWarningType = {
    id: DeleteWarningEnum.DeleteUndefined,
    title: 'Undefined',
    description: 'Undefined',
    ariaLabel: 'Undefined'
}
