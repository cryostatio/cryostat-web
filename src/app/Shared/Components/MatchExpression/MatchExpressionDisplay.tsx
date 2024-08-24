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
import { ClipboardCopy } from '@patternfly/react-core';
import * as React from 'react';

export interface MatchExpressionDisplayProps {
  matchExpression: string;
}

export const MatchExpressionDisplay: React.FC<MatchExpressionDisplayProps> = ({ matchExpression }) => {
  return (
    <ClipboardCopy
      className="match-expression-display"
      hoverTip="Copy"
      clickTip="Copied"
      variant="inline-compact"
      isBlock
      isCode
    >
      {matchExpression}
    </ClipboardCopy>
  );
};
