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
import { dashboardCardConfigReorderCardIntent } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import { css } from '@patternfly/react-styles';
import React from 'react';
import { useDispatch } from 'react-redux';
import { handleDisabledElements } from './ResizableRef';

const getOverlapScales = (dragIndex: number, hoverIndex: number): [number, number] => {
  let leftScale = OFFSET_SCALE;
  let rightScale = OFFSET_SCALE;
  if (dragIndex - hoverIndex == -1) {
    leftScale = 0;
  }
  if (dragIndex - hoverIndex == 1) {
    rightScale = 0;
  }
  return [leftScale, rightScale];
};

const getBetweenScales = (dragIndex: number, gapIndex: number): [number, number] => {
  let leftScale = OFFSET_SCALE;
  let rightScale = OFFSET_SCALE;
  if (dragIndex - gapIndex == 0) {
    leftScale = 0;
  }
  if (dragIndex - gapIndex == -1) {
    rightScale = 0;
  }
  return [leftScale, rightScale];
};

const overlaps = (ev: MouseEvent, rect: DOMRect, scales: [number, number]): boolean => {
  const [leftScale, rightScale] = scales;
  return (
    ev.clientX - rect.width * leftScale > rect.left &&
    ev.clientX + rect.width * rightScale < rect.right &&
    ev.clientY > rect.top &&
    ev.clientY < rect.bottom
  );
};

type ItemPosition = 'left' | 'right' | 'inBetween';
//
// |-----------------| mouse |-----------------|
// |   rect1.right   ^       ^   rect2.left    |
// |                 |       |                 |
// returns [inBetweenTwoRectangles, {insertedOnLeft, insertedOnRight, else}]
const inBetween = (
  ev: MouseEvent,
  rect1: DOMRect,
  rect2: DOMRect,
  scales: [number, number]
): [boolean, ItemPosition] => {
  const [leftScale, rightScale] = scales;
  const withinHeightRect1 = ev.clientY > rect1.top && ev.clientY < rect1.bottom;
  const withinHeightRect2 = ev.clientY > rect2.top && ev.clientY < rect2.bottom;
  // Cases
  // same row -> between: no ends
  const singleRowBetween =
    rect1.top === rect2.top &&
    rect1.right <= ev.clientX + rect1.width * leftScale &&
    ev.clientX - rect2.width * rightScale <= rect2.left &&
    withinHeightRect1;
  // same row -> before: left end
  const singleRowBefore =
    rect1.top === rect2.top && ev.clientX <= rect2.left && rect1.left >= rect2.right && withinHeightRect1;
  // same row -> after: right end
  const singleRowAfter =
    rect1.top === rect2.top && ev.clientX >= rect1.right && rect1.right >= rect2.left && withinHeightRect1;

  // different rows -> before: left end
  const multRowBefore = rect1.top !== rect2.top && ev.clientX <= rect2.left && withinHeightRect2;
  if (multRowBefore || singleRowBefore) {
    return [true, 'left'];
  }
  // different rows -> after: right end
  const multRowAfter = rect1.top !== rect2.top && ev.clientX >= rect1.right && withinHeightRect1;
  if (multRowAfter || singleRowAfter) {
    return [true, 'right'];
  }
  // different rows -> between: no ends
  return [singleRowBetween, 'inBetween'];
};

const INIT_STYLE = {};
const OFFSET_SCALE = 0.33;

interface DroppableItem {
  index: number;
  node: HTMLElement;
  rect: DOMRect;
  isDraggingHost: boolean;
}

const transitions = ['overlap', 'left', 'right', 'reset'] as const;
type Transition = (typeof transitions)[number];

const resetDroppableItem = (di: DroppableItem) => {
  function onTransitionEnd(ev: TransitionEvent) {
    if (ev.propertyName !== 'transform') {
      return;
    }
    di.node.classList.remove(`${draggableRefKlazz}-wrapper__reset`);
    di.node.removeEventListener('transitionend', onTransitionEnd);
  }
  if (
    di.node.className
      .split(/\s+/)
      .some((c) => c.startsWith(`${draggableRefKlazz}-wrapper__`) && c !== `${draggableRefKlazz}-wrapper__reset`)
  ) {
    setDroppableItem(di, 'reset');
    di.node.addEventListener('transitionend', onTransitionEnd);
    di.node.addEventListener('transitioncancel', onTransitionEnd);
  }
};

const setDroppableItem = (di: DroppableItem, transition: Transition) => {
  for (const tr of transitions) {
    di.node.classList.remove(`${draggableRefKlazz}-wrapper__${tr}`);
  }
  di.node.classList.add(`${draggableRefKlazz}-wrapper__${transition}`);
};

export interface DraggableRefProps {
  children: React.ReactNode;
  dashboardId: number;
}

export const draggableRefKlazz = `draggable-ref`;

export const DraggableRef: React.FunctionComponent<DraggableRefProps> = ({
  children,
  dashboardId,
  ..._props
}: DraggableRefProps) => {
  const dispatch = useDispatch();
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const startCoords = React.useRef<[number, number]>([0, 0]);
  const insertPosition = React.useRef<number | undefined>(undefined);
  const mouseMoveListener = React.useRef<EventListener>();
  const mouseUpListener = React.useRef<EventListener>();

  const isMouseDown = React.useRef<boolean>(false);
  const swap = React.useRef<boolean>(true);

  const [refStyle, setRefStyle] = React.useState<object>(INIT_STYLE);
  const [isDragging, setIsDragging] = React.useState(false);

  const onTransitionEnd = React.useCallback(
    (ev: React.TransitionEvent<HTMLElement>) => {
      if (ev.propertyName === 'transform' && isDragging && !isMouseDown.current) {
        setIsDragging(false);
        setRefStyle(INIT_STYLE);
      }
      handleDisabledElements(false);
    },
    [setIsDragging, setRefStyle, isDragging]
  );

  const onMouseUpWhileDragging = React.useCallback(
    (droppableItems: DroppableItem[]) => {
      droppableItems.forEach(resetDroppableItem);
      isMouseDown.current = false;
      if (mouseMoveListener.current && mouseUpListener.current) {
        document.removeEventListener('mousemove', mouseMoveListener.current);
        document.removeEventListener('mouseup', mouseUpListener.current);
      }
      if (insertPosition.current !== undefined) {
        setIsDragging(false);
        setRefStyle(INIT_STYLE);
        dispatch(dashboardCardConfigReorderCardIntent(dashboardId, insertPosition.current, swap.current));
      } else {
        setRefStyle({
          transition: 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s',
          transform: '',
          ...refStyle,
        });
      }
      handleDisabledElements(false);
    },
    [dispatch, setIsDragging, setRefStyle, refStyle, dashboardId]
  );

  const onMouseMoveWhileDragging = React.useCallback(
    (ev: MouseEvent, droppableItems: DroppableItem[]) => {
      insertPosition.current = undefined;
      const currDragged = wrapperRef.current;
      if (currDragged) {
        const dragIndex = droppableItems.findIndex((di) => di.isDraggingHost);
        droppableItems.forEach((di, idx) => {
          let scales = getOverlapScales(dragIndex, idx);
          if (!di.isDraggingHost && overlaps(ev, di.rect, scales)) {
            // mouse is hovering on a card
            setDroppableItem(di, 'overlap');
            insertPosition.current = idx;
            swap.current = true;
            droppableItems.filter((_di, _idx) => _idx !== dragIndex && _idx !== idx).forEach(resetDroppableItem);
          } else {
            // mouse is hovering between two cards
            const gapIndex = (idx + 1) % droppableItems.length;
            const nextItem = droppableItems[gapIndex];
            scales = getBetweenScales(dragIndex, gapIndex);
            const [betweenTwoRects, draggedPosition] = inBetween(ev, di.rect, nextItem.rect, scales);
            // check if hovering right next to each other in the adjacent gap indices
            if (gapIndex - dragIndex == 1 || (gapIndex - dragIndex == 0 && draggedPosition != 'right')) {
              // check if insertPosition is undefined because then we are no longer hovering
              // and we want to reset any cards that are not being transitioned by the hover
              if (!di.isDraggingHost && insertPosition.current == undefined) resetDroppableItem(di);
              return;
            }
            if (betweenTwoRects && droppableItems.length > 1) {
              // [     0,    1,    2,    3     ] dashboard span array
              // {  0  |  1  |  2  |  3  |  4  } gap indices (drop zones)
              /*
                If we wanted to put 0 between indexes 2 and 3, we would have to specify the gapIndex of 3 (idx + 1)
              */
              // [     0,    1,    2,
              //       3     ]                multi-row dashboard span array
              // {  0  |  1  |  2  |  3(a)
              //   3(b) |  4  }               (idealized) gap indices
              //
              // caveat -> gapIndex is always the 0 index when hovering at the end of the last card in the grid
              // (this is not idealized, but it is how it is implemented)
              // that is why there is a special case to set the insertPosition specially

              insertPosition.current = gapIndex;
              swap.current = false;

              // check which items should be translated
              droppableItems.forEach((_item, _idx) => {
                if (_item.isDraggingHost) {
                  return;
                }
                // check the position we are hovering the card over
                /* this case needs to be checked so that cards to the left of the dragged card are
                   not translated when the dragged card is being dragged to the right, and vice versa */

                // if (dragIndex >= gapIndex) => we are dragging the card "backwards"
                if (dragIndex >= gapIndex) {
                  if (draggedPosition == 'left') {
                    if (_idx >= gapIndex && _idx < dragIndex && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, `right`);
                    } else {
                      resetDroppableItem(_item);
                    }
                  } else if (draggedPosition == 'right') {
                    if (_idx < gapIndex && dragIndex !== gapIndex && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, `left`);
                    }
                    // special case: moving non 0th card to end
                    else if (gapIndex == 0 && _idx > dragIndex && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, `left`);
                      insertPosition.current = idx + 1;
                    } else {
                      resetDroppableItem(_item);
                    }
                  } else {
                    if (_idx < gapIndex && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, `left`);
                    } else if (_idx >= gapIndex && _idx < dragIndex && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, `right`);
                    } else {
                      resetDroppableItem(_item);
                    }
                  }
                } else {
                  // if (dragOrder < gapIndex)
                  if (draggedPosition == 'left') {
                    if (_idx >= gapIndex && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, `right`);
                    } else {
                      resetDroppableItem(_item);
                    }
                  } else if (draggedPosition == 'right') {
                    if (_idx < gapIndex && _idx > dragIndex && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, `left`);
                    } else {
                      resetDroppableItem(_item);
                    }
                  } else {
                    if (_idx < gapIndex && _idx > dragIndex && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, `left`);
                    } else if (_idx >= gapIndex && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, `right`);
                    } else {
                      resetDroppableItem(_item);
                    }
                  }
                }
              });
            } else {
              // reset when the mouse is not hovering on a card or between two cards
              if (!di.isDraggingHost && insertPosition.current == null) resetDroppableItem(di);
            }
          }
        });
      }
      setRefStyle({
        ...refStyle,
        position: 'relative',
        zIndex: 5000,
        transition: '',
        transform: `translate(${ev.pageX - startCoords.current[0]}px, ${ev.pageY - startCoords.current[1]}px)`,
      });
      handleDisabledElements(true);
    },
    [setRefStyle, refStyle]
  );

  const onDragStart = React.useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      if (isDragging) {
        return;
      }
      isMouseDown.current = true;
      const dragging = ev.target as HTMLElement;
      const rect = dragging.getBoundingClientRect();

      const draggableNodes: HTMLElement[] = Array.from(document.querySelectorAll(`div.${draggableRefKlazz}-wrapper`));
      const droppableItems: DroppableItem[] = draggableNodes.map((node, index) => {
        const isDraggingHost = node.contains(dragging);
        const droppableItem: DroppableItem = {
          index: index,
          node: node,
          rect: node.getBoundingClientRect(),
          isDraggingHost: isDraggingHost,
        };
        return droppableItem;
      });

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
      mouseMoveListener.current = (ev) => onMouseMoveWhileDragging(ev as MouseEvent, droppableItems);
      mouseUpListener.current = () => onMouseUpWhileDragging(droppableItems);
      document.addEventListener('mousemove', mouseMoveListener.current);
      document.addEventListener('mouseup', mouseUpListener.current);
      handleDisabledElements(true);
    },
    [setRefStyle, setIsDragging, onMouseMoveWhileDragging, onMouseUpWhileDragging, refStyle, isDragging]
  );

  return (
    <div
      ref={wrapperRef}
      className={css(`${draggableRefKlazz}-wrapper`)}
      onDragStart={onDragStart}
      onTransitionEnd={onTransitionEnd}
      style={{ ...refStyle }}
    >
      {children}
    </div>
  );
};
