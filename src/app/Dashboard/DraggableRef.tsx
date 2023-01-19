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
import {
  CardConfig,
  dashboardCardConfigReorderCardIntent,
} from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import _ from 'lodash';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

function overlaps(ev: MouseEvent, rect: DOMRect) {
  return (
    ev.clientX > rect.x && ev.clientX < rect.x + rect.width && ev.clientY > rect.y && ev.clientY < rect.y + rect.height
  );
}

const initStyle = {
  // per card color? users can label their cards too?
  backgroundColor: 'var(--pf-global--palette--blue-200)',
  borderTopColor: 'var(--pf-global--BorderColor--100)'
};

interface DroppableItem {
  node: HTMLElement;
  rect: DOMRect;
  isDraggingHost: boolean;
}

// Reset per-element state
function resetDroppableItem(droppableItem: DroppableItem) {
  droppableItem.node.style.backgroundColor = initStyle.backgroundColor;
  droppableItem.node.style.borderTopColor = 'var(--pf-global--BorderColor--100)';
}

export interface DraggableRefProps {
  children: React.ReactNode;
  dashboardId: number;
}

export const DraggableRef: React.FunctionComponent<DraggableRefProps> = ({
  children,
  dashboardId,
  ..._props
}: DraggableRefProps) => {
  const dispatch = useDispatch();
  const ref = React.useRef<HTMLDivElement>(null);

  let [refStyle, setRefStyle] = React.useState<{}>(initStyle);
  /* eslint-enable prefer-const */
  const [isDragging, setIsDragging] = React.useState(false);
  const [selected, setSelected] = React.useState(false);
  let startX = 0;
  let startY = 0;
  let hoveringDroppable: HTMLElement | null;
  let hoveringIndex: number | null;
  let mouseMoveListener: EventListener;
  let mouseUpListener: EventListener;

  const onTransitionEnd = React.useCallback((_ev: React.TransitionEvent<HTMLElement>) => {
    if (isDragging) {
      setIsDragging(false);
      setRefStyle(initStyle);
    }
  }, [setIsDragging, setRefStyle, isDragging]);

  const onMouseUpWhileDragging = React.useCallback(
    (droppableItems) => {
      droppableItems.forEach(resetDroppableItem);
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('mouseup', mouseUpListener);
      if (hoveringDroppable && hoveringIndex !== null) {
        setIsDragging(false);
        setRefStyle(initStyle);
        dispatch(dashboardCardConfigReorderCardIntent(dashboardId, hoveringIndex));
      } else {
        setRefStyle({
          ...refStyle,
          transition: 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s',
          transform: '',
        });
      }
      setSelected(false);
    },
    [dispatch, setIsDragging, setRefStyle, refStyle, dashboardId]
  );

  const onMouseMoveWhileDragging = React.useCallback((ev: MouseEvent, draggableItems: DroppableItem[]) => {
    hoveringDroppable = null;
    hoveringIndex = null;
    draggableItems.forEach((draggableItem) => {
      if (overlaps(ev, draggableItem.rect) && !draggableItem.isDraggingHost) {        
        draggableItem.node.style.backgroundColor = 'var(--pf-global--palette--green-100)';
        hoveringDroppable = draggableItem.node;
        hoveringIndex = parseInt(draggableItem.node.getAttribute('dashboard-card-order') as string);
      } else {
        resetDroppableItem(draggableItem);
      }
    });
    setRefStyle({
      ...refStyle,
      transform: `translate(${ev.pageX - startX}px, ${ev.pageY - startY}px)`,
    });
  }, [setRefStyle, refStyle]);

  const onDragStart = React.useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      if (isDragging) {
        return;
      }
      const dragging = ev.target as HTMLElement;
      const rect = dragging.getBoundingClientRect();
      const draggableNodes = Array.from(document.querySelectorAll('div.draggable-ref'));
      const draggableItems = draggableNodes.reduce((acc: any[], cur) => {
        const isDraggingHost = cur.contains(dragging);
        const droppableItem = {
          node: cur,
          rect: cur.getBoundingClientRect(),
          isDraggingHost,
        };
        acc.push(droppableItem);
        return acc;
      }, []);

      refStyle = {
        ...refStyle,
        top: rect.y,
        left: rect.x,
        width: rect.width,
        height: rect.height,
        position: 'fixed',
        zIndex: 5000,
      } as any;
      startX = ev.pageX;
      startY = ev.pageY;
      setRefStyle(refStyle);
      setIsDragging(true);
      setSelected(true);
      mouseMoveListener = (ev) => onMouseMoveWhileDragging(ev as MouseEvent, draggableItems);
      mouseUpListener = () => onMouseUpWhileDragging(draggableItems);
      document.addEventListener('mousemove', mouseMoveListener);
      document.addEventListener('mouseup', mouseUpListener);
    },
    [setRefStyle, setIsDragging, setSelected, onMouseMoveWhileDragging, onMouseUpWhileDragging, isDragging]
  );

  const variableAttribute = React.useMemo(() => {
    return { ['dashboard-card-order']: dashboardId };
  }, [dashboardId]);

  return (
    <div
      className={css(
        `draggable-ref`
      )}
      {...variableAttribute}
      onDragStart={onDragStart}
      onTransitionEnd={onTransitionEnd}
      style={{ ...refStyle }}
    >
      <div ref={ref} draggable className={css('draggable-ref__grip')}>
        <GripVerticalIcon />
      </div>
      <div className={css("draggable-ref__content", selected && 'draggable-ref__dragging')}>{children}</div>
    </div>
  );
};
