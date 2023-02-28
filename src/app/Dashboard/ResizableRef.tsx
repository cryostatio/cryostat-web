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
import { CardConfig, dashboardCardConfigResizeCardIntent } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { gridSpans } from '@patternfly/react-core';
import _ from 'lodash';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DashboardCardSizes } from './Dashboard';
import { DashboardCardContext } from './DashboardCard';

export interface ResizableRefProps {
  dashboardId: number;
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

export const ResizableRef: React.FunctionComponent<ResizableRefProps> = ({
  dashboardId,
  cardSizes,
  ..._props
}: ResizableRefProps) => {
  const cardConfigs: CardConfig[] = useSelector((state: RootState) => state.dashboardConfigs.list);
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

        dispatch(dashboardCardConfigResizeCardIntent(dashboardId, gridSpan));
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
