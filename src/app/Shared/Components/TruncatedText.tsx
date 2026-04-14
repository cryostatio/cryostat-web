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

import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button } from '@patternfly/react-core';
import * as React from 'react';

export interface TruncatedTextProps {
  text: string;
  maxLength?: number;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({ text, maxLength = 100 }) => {
  const { t } = useCryostatTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }

  const truncatedText = text.substring(0, maxLength);

  return (
    <span>
      {isExpanded ? text : `${truncatedText}...`}
      <Button
        variant="link"
        isInline
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ padding: '0 4px', fontSize: 'inherit' }}
      >
        {isExpanded ? t('SHOW_LESS') : t('SHOW_MORE')}
      </Button>
    </span>
  );
};
