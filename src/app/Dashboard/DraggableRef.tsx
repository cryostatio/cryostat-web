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
import { dashboardCardConfigReorderCardIntent } from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { css } from '@patternfly/react-styles';
import React from 'react';
import { useDispatch } from 'react-redux';

type itemPosition = 'left' | 'right' | 'else';
//
// |-----------------| mouse |-----------------|
// |   rect1.right   ^       ^   rect2.left    |
// |                 |       |                 |
// returns [inBetweenTwoRectangles, {insertedOnLeft, insertedOnRight, else}]
function inBetween(ev: MouseEvent, rect1: DOMRect, rect2: DOMRect): [boolean, itemPosition] {
  const withinHeightRect1 = ev.clientY > rect1.top && ev.clientY < rect1.bottom;
  const withinHeightRect2 = ev.clientY > rect2.top && ev.clientY < rect2.bottom;
  // Cases
  // same row -> between: no ends
  const singleRowBetween =
    rect1.top === rect2.top &&
    rect1.right <= ev.clientX + translateX &&
    ev.clientX - translateX <= rect2.left &&
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
  return [singleRowBetween, 'else'];
}

function getOrder(el: HTMLElement): number {
  return parseInt(el.getAttribute(dashboardCardOrderAttribute) as string);
}

const initStyle = {};

const transition = 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s';
const delayedTransition = 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0.3s';
const overlapTranslateY = -15;
const translateX = 50;

function overlaps(ev: MouseEvent, rect: DOMRect) {
  return (
    ev.clientX - translateX > rect.left &&
    ev.clientX + translateX < rect.right &&
    ev.clientY > rect.top &&
    ev.clientY < rect.bottom
  );
}

export const dashboardCardOrderAttribute = 'dashboard-card-order';

interface DroppableItem {
  index: number;
  node: HTMLElement;
  rect: DOMRect;
  isDraggingHost: boolean;
  isHovered: boolean;
}

function resetDroppableItem(droppableItem: DroppableItem) {
  droppableItem.node.style.transition = transition;
  droppableItem.node.style.transform = '';
  droppableItem.isHovered = false;
}

function setDroppableItem(droppableItem: DroppableItem, transition: string, transform: string, isHovered?: boolean) {
  droppableItem.node.style.transition = transition;
  droppableItem.node.style.transform = transform;
  if (isHovered !== undefined) {
    droppableItem.isHovered = isHovered;
  }
}

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
  const hoveringDroppable = React.useRef<HTMLElement | null>(null);
  const hoveringIndex = React.useRef<number | null>(null);
  const mouseMoveListener = React.useRef<EventListener>();
  const mouseUpListener = React.useRef<EventListener>();
  const isMouseDown = React.useRef<boolean>(false);
  const swap = React.useRef<boolean>(true);

  const [refStyle, setRefStyle] = React.useState<object>(initStyle);
  const [isDragging, setIsDragging] = React.useState(false);

  const onTransitionEnd = React.useCallback(
    (_ev: React.TransitionEvent<HTMLElement>) => {
      if (isDragging && !isMouseDown.current) {
        setIsDragging(false);
        setRefStyle(initStyle);
      }
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
      if (hoveringDroppable.current && hoveringIndex.current !== null) {
        setIsDragging(false);
        setRefStyle({
          ...initStyle,
          transition: transition,
          transform: '',
        });
        dispatch(dashboardCardConfigReorderCardIntent(dashboardId, hoveringIndex.current, swap.current));
      } else {
        setRefStyle({
          ...refStyle,
          transition: transition,
          transform: '',
        });
      }
    },
    [dispatch, setIsDragging, setRefStyle, refStyle, dashboardId]
  );

  const onMouseMoveWhileDragging = React.useCallback(
    (ev: MouseEvent, droppableItems: DroppableItem[]) => {
      hoveringDroppable.current = null;
      hoveringIndex.current = null;
      const currDragged = wrapperRef.current;
      if (currDragged) {
        isMouseDown.current = true;
        const dragOrder = getOrder(currDragged);
        droppableItems.forEach((di, idx) => {
          // mouse is hovering on a card
          if (!di.isDraggingHost && overlaps(ev, di.rect)) {
            setDroppableItem(di, transition, `translate(0, ${overlapTranslateY}px`, false);
            hoveringDroppable.current = di.node;
            hoveringIndex.current = idx;
            swap.current = true;
            // reset non overlapping items
            droppableItems.forEach((_item, _idx) => {
              if (_idx == idx || _item.isDraggingHost) {
                return;
              }
              resetDroppableItem(_item);
            });
          } else {
            // mouse is hovering between two cards
            const nextItem = droppableItems[(idx + 1) % droppableItems.length];
            const [betweenTwoRects, draggedPosition] = inBetween(ev, di.rect, nextItem.rect);
            if (betweenTwoRects && droppableItems.length > 1) {
              const hover = (idx + 1) % droppableItems.length;
              // if the dragged card has a greater order than the hovered card
              if (dragOrder > hover) {
                di.isHovered = false;
                hoveringDroppable.current = nextItem.node;
                hoveringIndex.current = hover;
                swap.current = false;
                // check which items should be translated
                droppableItems.forEach((_item, _idx) => {
                  if (_item.isDraggingHost) {
                    return;
                  }
                  // handle cases where the hovered card is the first or last card of a row is hovered in
                  if (draggedPosition == 'left') {
                    if (_idx >= hover && _idx < dragOrder && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(${translateX}px, 0px)`, true);
                    }
                  } else if (draggedPosition == 'right') {
                    if (_idx < hover && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(-${translateX}px, 0px)`, true);
                    }
                    // special case where moving card to end (very last card) overflows hoveredIndex back to 0
                    else if (hover == 0 && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(-${translateX}px, 0px)`, true);
                      hoveringDroppable.current = di.node;
                      hoveringIndex.current = idx;
                    }
                  } else {
                    if (_idx < hover && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(-${translateX}px, 0px)`, true);
                    } else if (_idx >= hover && _idx < dragOrder && _item.rect.top == nextItem.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(${translateX}px, 0px)`, true);
                    }
                  }
                });
              } else if (dragOrder < idx) {
                di.isHovered = false;
                hoveringDroppable.current = di.node;
                hoveringIndex.current = idx;
                swap.current = false;
                droppableItems.forEach((_item, _idx) => {
                  if (_item.isDraggingHost) {
                    return;
                  }
                  if (draggedPosition == 'left') {
                    if (_idx > idx && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(${translateX}px, 0px)`, true);
                    }
                  }
                  // correct
                  else if (draggedPosition == 'right') {
                    if (_idx <= idx && _idx > dragOrder && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(-${translateX}px, 0px)`, true);
                    }
                  } else {
                    if (_idx <= idx && _idx > dragOrder && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(-${translateX}px, 0px)`, true);
                    } else if (_idx > idx && _item.rect.top == di.rect.top) {
                      setDroppableItem(_item, delayedTransition, `translate(${translateX}px, 0px)`, true);
                    }
                  }
                });
              } else {
                if (!di.isDraggingHost && !di.isHovered) {
                  resetDroppableItem(di);
                }
              }
            } else {
              if (!di.isDraggingHost && hoveringDroppable.current == null) {
                resetDroppableItem(di);
              }
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
    },
    [setRefStyle, refStyle]
  );

  const onDragStart = React.useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      if (isDragging) {
        return;
      }
      const dragging = ev.target as HTMLElement;
      const rect = dragging.getBoundingClientRect();

      const draggableNodes: HTMLElement[] = Array.from(document.querySelectorAll(`div.${draggableRefKlazz}-wrapper`));
      const droppableItems: DroppableItem[] = draggableNodes.reduce((acc: DroppableItem[], cur) => {
        const isDraggingHost = cur.contains(dragging);
        const droppableItem: DroppableItem = {
          index: getOrder(cur),
          node: cur,
          rect: cur.getBoundingClientRect(),
          isDraggingHost: isDraggingHost,
          isHovered: false,
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
      mouseMoveListener.current = (ev) => onMouseMoveWhileDragging(ev as MouseEvent, droppableItems);
      mouseUpListener.current = () => onMouseUpWhileDragging(droppableItems);
      document.addEventListener('mousemove', mouseMoveListener.current);
      document.addEventListener('mouseup', mouseUpListener.current);
    },
    [setRefStyle, setIsDragging, onMouseMoveWhileDragging, onMouseUpWhileDragging, refStyle, isDragging]
  );

  const variableAttribute = React.useMemo(() => {
    return { [dashboardCardOrderAttribute]: dashboardId };
  }, [dashboardId]);

  return (
    <div
      ref={wrapperRef}
      className={css(`${draggableRefKlazz}-wrapper`)}
      onDragStart={onDragStart}
      onTransitionEnd={onTransitionEnd}
      style={{ ...refStyle }}
      {...variableAttribute}
    >
      {children}
    </div>
  );
};
