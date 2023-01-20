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
  dashboardCardConfigReorderCardIntent,
} from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import React from 'react';
import { useDispatch } from 'react-redux';

function overlaps(ev: MouseEvent, rect: DOMRect) {
  return (
    ev.clientX > rect.x && ev.clientX < rect.x + rect.width && ev.clientY > rect.y && ev.clientY < rect.y + rect.height
  );
}

const initStyle = {
  // per card color? users can label their cards too?
  backgroundColor: 'var(--pf-global--palette--blue-200)',
};

const overlapColor = 'var(--pf-global--palette--green-100)';

export const dashboardCardOrderAttribute = 'dashboard-card-order';

interface DroppableItem {
  node: HTMLElement;
  rect: DOMRect;
  isDraggingHost: boolean;
}

function resetDroppableItem(droppableItem: DroppableItem) {
  droppableItem.node.style.backgroundColor = initStyle.backgroundColor;
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
  const draggableRef = React.useRef<HTMLDivElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const startCoords = React.useRef<[number, number]>([0, 0]);
  const hoveringDroppable = React.useRef<HTMLElement | null>(null) ;
  const hoveringIndex = React.useRef<number | null>(null);
  const mouseMoveListener = React.useRef<EventListener>();
  const mouseUpListener = React.useRef<EventListener>();

  const [refStyle, setRefStyle] = React.useState<object>(initStyle);
  const [isDragging, setIsDragging] = React.useState(false);
  const [selected, setSelected] = React.useState(false);

  const className = `draggable-ref`;

  const onTransitionEnd = React.useCallback((_ev: React.TransitionEvent<HTMLElement>) => {
      setIsDragging(false);
      setRefStyle(initStyle);
  }, [setIsDragging, setRefStyle]);

  const onMouseUpWhileDragging = React.useCallback((droppableItems: DroppableItem[]) => {
    droppableItems.forEach(resetDroppableItem);
    if (mouseMoveListener.current && mouseUpListener.current) {
      document.removeEventListener('mousemove', mouseMoveListener.current);
      document.removeEventListener('mouseup', mouseUpListener.current);
    }
    if (hoveringDroppable.current && hoveringIndex.current !== null) {
      setIsDragging(false);
      setSelected(false);
      setRefStyle({
        ...initStyle,
        transition: 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s',
        transform: '',
      });
      dispatch(dashboardCardConfigReorderCardIntent(dashboardId, hoveringIndex.current));
    } else {
      setSelected(false);
      setRefStyle({
        ...refStyle,
        transition: 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s',
        transform: '',
      });
    }
  }, [dispatch, setIsDragging, setSelected, setRefStyle, refStyle, dashboardId]);

  const onMouseMoveWhileDragging = React.useCallback((ev: MouseEvent, draggableItems: DroppableItem[]) => {
    hoveringDroppable.current = null;
    hoveringIndex.current = null;
    draggableItems.forEach((draggableItem) => {
      if (overlaps(ev, draggableItem.rect) && !draggableItem.isDraggingHost) {        
        draggableItem.node.style.backgroundColor = overlapColor;
        hoveringDroppable.current = draggableItem.node;
        hoveringIndex.current = parseInt(draggableItem.node.getAttribute(dashboardCardOrderAttribute) as string);
      } else {
        resetDroppableItem(draggableItem);
      }
    });
    setRefStyle({
      ...refStyle,
      position: 'relative',
      zIndex: 5000,
      transform: `translate(${ev.pageX - startCoords.current[0]}px, ${ev.pageY - startCoords.current[1]}px)`,
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

      const draggableNodes: HTMLElement[] = Array.from(document.querySelectorAll(`div.${className}`));
      const draggableItems: DroppableItem[] = draggableNodes.reduce((acc: DroppableItem[], cur) => {
        const isDraggingHost = cur.contains(dragging);
        const droppableItem: DroppableItem = {
          node: cur,
          rect: cur.getBoundingClientRect(),
          isDraggingHost,
        };
        acc.push(droppableItem);
        return acc;
      }, []);

      const initStyle = {
        ...refStyle,
        position: 'relative',
        top: rect.y,
        left: rect.x,
        width: rect.width,
        height: rect.height,
        zIndex: 5000,
      };

      startCoords.current = [ev.pageX, ev.pageY];
      setRefStyle(initStyle);
      setIsDragging(true);
      setSelected(true);
      mouseMoveListener.current = (ev) => onMouseMoveWhileDragging(ev as MouseEvent, draggableItems);
      mouseUpListener.current = () => onMouseUpWhileDragging(draggableItems);
      document.addEventListener('mousemove', mouseMoveListener.current);
      document.addEventListener('mouseup', mouseUpListener.current);
    },
    [setRefStyle, setIsDragging, setSelected, onMouseMoveWhileDragging, onMouseUpWhileDragging, refStyle, isDragging]
  );

  const variableAttribute = React.useMemo(() => {
    return { [dashboardCardOrderAttribute]: dashboardId };
  }, [dashboardId]);

  return (
    <div
      ref={wrapperRef}
      className={css(className)}
      {...variableAttribute}
      onDragStart={onDragStart}
      onTransitionEnd={onTransitionEnd}
      style={{ ...refStyle }}
    >
      <div ref={draggableRef} draggable className={css(`${className}__grip`)}>
        <GripVerticalIcon />
      </div>
      <div className={css(`${className}__content`, selected && `${className}__dragging`)}>{children}</div>
    </div>
  );
};
