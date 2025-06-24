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
import { useMatchExpressionSvc } from '@app/utils/hooks/useMatchExpressionSvc';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Bullseye,
  Button,
  ClipboardCopy,
  Modal,
  ModalVariant,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { MatchExpressionVisualizer } from './MatchExpressionVisualizer';

export interface MatchExpressionDisplayProps {
  matchExpression: string;
}

export const MatchExpressionDisplay: React.FC<MatchExpressionDisplayProps> = ({ matchExpression }) => {
  const addSubscription = useSubscriptions();
  const { t } = useCryostatTranslation();
  const [showModal, setShowModal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const matchExprSvc = useMatchExpressionSvc();

  const handleClick = React.useCallback(() => {
    addSubscription(
      matchExprSvc.searchExpression({ immediateFn: () => setLoading(true) }).subscribe(() => setLoading(false)),
    );
    matchExprSvc.setSearchExpression(matchExpression);
    setShowModal(true);
  }, [addSubscription, matchExpression, matchExprSvc]);

  const handleClose = React.useCallback(() => {
    setLoading(false);
    setShowModal(false);
  }, [setLoading, setShowModal]);

  return (
    <Split hasGutter>
      <SplitItem>
        <Button variant="plain" onClick={handleClick}>
          <TopologyIcon />
        </Button>
        <Modal
          variant={ModalVariant.medium}
          title={t('MATCH_EXPRESSION_VISUALIZER.TITLE')}
          isOpen={showModal}
          onClose={handleClose}
        >
          {loading ? (
            <Bullseye>
              <Spinner />
            </Bullseye>
          ) : (
            <MatchExpressionVisualizer defaultGraphView={false} />
          )}
        </Modal>
      </SplitItem>
      <SplitItem isFilled>
        <ClipboardCopy
          className="match-expression-display"
          hoverTip={t('COPY')}
          clickTip={t('COPIED')}
          variant="inline-compact"
          isBlock
          isCode
          isReadOnly
        >
          {matchExpression}
        </ClipboardCopy>
      </SplitItem>
    </Split>
  );
};
