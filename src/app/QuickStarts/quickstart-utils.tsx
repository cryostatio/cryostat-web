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
