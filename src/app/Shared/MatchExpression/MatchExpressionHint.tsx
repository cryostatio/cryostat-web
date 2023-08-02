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
import { ClipboardCopyButton, CodeBlock, CodeBlockAction, CodeBlockCode } from '@patternfly/react-core';
import * as React from 'react';
import { Target } from '../Services/Target.service';

export interface MatchExpressionHintProps {
  target?: Target;
}

export const MatchExpressionHint: React.FC<MatchExpressionHintProps> = ({ target, ...props }) => {
  const [copied, setCopied] = React.useState(false);

  const exampleExpression = React.useMemo(() => {
    let body: string;
    if (!target || !target.alias || !target.connectUrl) {
      body = 'true';
    } else {
      body = `target.alias == '${target.alias}' || target.annotations.cryostat['PORT'] == ${target.annotations?.cryostat['PORT']}`;
    }
    body = JSON.stringify(body, null, 2);
    body = body.substring(1, body.length - 1);
    return body;
  }, [target]);

  const onSaveToClipboard = React.useCallback(() => {
    setCopied(true);
    navigator.clipboard.writeText(exampleExpression);
  }, [setCopied, exampleExpression]);

  const actions = React.useMemo(() => {
    return (
      <CodeBlockAction>
        <ClipboardCopyButton
          id="match-expression-copy-button"
          textId="match-expression-code-content"
          aria-label="Copy to clipboard"
          onClick={onSaveToClipboard}
          exitDelay={copied ? 1500 : 600}
          maxWidth="110px"
          variant="plain"
          onTooltipHidden={() => setCopied(false)}
        >
          {copied ? 'Copied!' : 'Click to copy to clipboard'}
        </ClipboardCopyButton>
      </CodeBlockAction>
    );
  }, [copied, onSaveToClipboard, setCopied]);

  return (
    <CodeBlock {...props} actions={actions}>
      <CodeBlockCode>{exampleExpression}</CodeBlockCode>
    </CodeBlock>
  );
};
