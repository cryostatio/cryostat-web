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

import { Card, CardProps } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import * as React from 'react';
import { DRAGGABLE_REF_KLAZZ } from './const';
import { DashboardCardContext } from './context';
import { DraggableRef } from './DraggableRef';
import { ResizableRef } from './ResizableRef';
import { DashboardCardSizes } from './types';

export interface DashboardCardProps extends CardProps {
  dashboardId: number;
  cardSizes: DashboardCardSizes;
  cardHeader: React.ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
  children?: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  children = null,
  cardHeader = null,
  dashboardId,
  isDraggable = true,
  isResizable = true,
  cardSizes,
  ...props
}: DashboardCardProps) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  const onMouseEnter = React.useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      cardRef.current.classList.add(`${DRAGGABLE_REF_KLAZZ}-hover`);
    }
  }, []);

  const onMouseLeave = React.useCallback((_e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      cardRef.current.classList.remove(`${DRAGGABLE_REF_KLAZZ}-hover`);
    }
  }, []);

  const resizeBar = React.useMemo(() => {
    return isResizable ? <ResizableRef cardId={dashboardId} cardSizes={cardSizes} /> : null;
  }, [isResizable, cardSizes, dashboardId]);

  const content = React.useMemo(
    () =>
      isDraggable ? (
        <DraggableRef dashboardId={dashboardId}>
          <div className={'dashboard-card-resizable-wrapper'} ref={cardRef}>
            <Card className="dashboard-card" isRounded {...props}>
              <div
                className={css(`${DRAGGABLE_REF_KLAZZ}__grip`)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                draggable // draggable is required for drag events to fire
                data-quickstart-id="card-draggable-grip"
              >
                {cardHeader}
              </div>
              {children}
            </Card>
            {resizeBar}
          </div>
        </DraggableRef>
      ) : (
        <>
          <Card isRounded {...props}>
            {cardHeader}
            {children}
          </Card>
          {resizeBar}
        </>
      ),
    [cardRef, props, onMouseEnter, onMouseLeave, cardHeader, children, isDraggable, dashboardId, resizeBar],
  );

  return <DashboardCardContext.Provider value={cardRef}>{content}</DashboardCardContext.Provider>;
};

DashboardCard.displayName = 'DashboardCard';
