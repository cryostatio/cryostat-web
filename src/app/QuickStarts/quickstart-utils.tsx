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
import cryostatLogoIcon from '@app/assets/cryostat_icon_rgb_default.svg';
import cryostatLogoIconDark from '@app/assets/cryostat_icon_rgb_reverse.svg';
import build from '@app/build.json';
import { withThemedIcon } from '@app/utils/withThemedIcon';

export const conclusion = (quickstartName: string, feature: string, closingMessage?: string) => `
<div>
    <p>You completed the <strong>${quickstartName}</strong> quick start!</p>
    <div style="max-width: 22rem">
        <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogoIcon}" alt="Cryostat Logo" width="100%" height="100%" />
        <p class="cryostat-text">cryostat</p>
        </div>
    ${
      closingMessage
        ? `<p>${closingMessage}</p>`
        : `<p>If you would like to learn more about the <strong>${feature}</strong> feature, check out the <a href="${build.documentationUrl}" target="_blank">[APP] documentation</a> for detailed guides and information.</p>`
    }
</div>`;

export const CryostatIcon = withThemedIcon(cryostatLogoIcon, cryostatLogoIconDark, 'Cryostat Icon');
