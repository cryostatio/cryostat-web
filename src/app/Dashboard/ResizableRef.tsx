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
import { dashboardConfigResizeCardIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { gridSpans } from '@patternfly/react-core';
import _ from 'lodash';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CardConfig, DashboardCardSizes } from './dashboard-utils';
import { DashboardCardContext } from './DashboardCard';

export interface ResizableRefProps {
  cardId: number;
  cardSizes: DashboardCardSizes;
}

function normalizeAsGridSpans(val: number, min: number, max: number, a: gridSpans, b: gridSpans): gridSpans {
  if (val < min) val = min;
  else if (val > max) val = max;
  const ans = Math.round((b - a) * ((val - min) / (max - min)) + a);
  return _.clamp(ans, a, b) as gridSpans;
}

export function handleDisabledElements(disabled: boolean): void {
  const disabledElements: HTMLElement[] = Array.from(document.querySelectorAll('.disabled-pointer'));
  disabledElements.forEach((el) => (el.style['pointer-events'] = disabled ? 'none' : 'auto'));
}

export const ResizableRef: React.FC<ResizableRefProps> = ({
  cardId: dashboardId,
  cardSizes,
  ..._props
}: ResizableRefProps) => {
  const cardConfigs: CardConfig[] = useSelector(
    (state: RootState) => state.dashboardConfigs.layouts[state.dashboardConfigs.current].cards
  );
  const dispatch = useDispatch();

  const cardRef = React.useContext(DashboardCardContext);
  const isResizing = React.useRef<boolean>(false);
  const minWidth = React.useRef<number | undefined>(undefined);
  const maxWidth = React.useRef<number | undefined>(undefined);

  const nearEdgeMultiplier = React.useCallback((mousePos: number): number => {
    const CLOSE_TO_EDGE = 0.995;
    const EDGE_MULTIPLIER = 0.9;
    if (mousePos > window.innerWidth * CLOSE_TO_EDGE) {
      return EDGE_MULTIPLIER;
    } else {
      return 1;
    }
  }, []);

  const callbackMouseMove = React.useCallback(
    (e: MouseEvent) => {
      const mousePos = e.clientX;
      e.stopPropagation();
      if (!isResizing.current) {
        return;
      }
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'end' });
        const cardRect = cardRef.current.getBoundingClientRect();

        if (minWidth.current === undefined) {
          minWidth.current = cardSizes.span.minimum * (cardRect.width / cardConfigs[dashboardId].span);
        }
        if (maxWidth.current === undefined) {
          maxWidth.current = cardSizes.span.maximum * (cardRect.width / cardConfigs[dashboardId].span);
        }

        const minCardRight = cardRect.left + minWidth.current;
        const maxCardRight = cardRect.left + maxWidth.current * nearEdgeMultiplier(mousePos);

        const newSize = mousePos;

        const gridSpan = normalizeAsGridSpans(
          newSize,
          minCardRight,
          maxCardRight,
          cardSizes.span.minimum,
          cardSizes.span.maximum
        ) as gridSpans;

        dispatch(dashboardConfigResizeCardIntent(dashboardId, gridSpan));
      } else {
        console.error('cardRef.current is undefined');
      }
    },
    [dispatch, cardRef, cardConfigs, nearEdgeMultiplier, dashboardId, cardSizes]
  );

  const callbackMouseUp = React.useCallback(() => {
    if (!isResizing.current) {
      return;
    }
    isResizing.current = false;
    document.body.style.removeProperty('cursor');
    document.removeEventListener('mousemove', callbackMouseMove);
    document.removeEventListener('mouseup', callbackMouseUp);
    handleDisabledElements(false);
  }, [callbackMouseMove]);

  const handleOnMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      e.stopPropagation();
      e.preventDefault();
      document.body.style.setProperty('cursor', 'col-resize');
      document.addEventListener('mousemove', callbackMouseMove);
      document.addEventListener('mouseup', callbackMouseUp);
      isResizing.current = true;
      minWidth.current = undefined;
      maxWidth.current = undefined;
      handleDisabledElements(true);
    },
    [callbackMouseMove, callbackMouseUp]
  );

  return <div className="resizable-ref" onMouseDown={handleOnMouseDown} />;
};
