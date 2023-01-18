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
    dashboardCardConfigResizeCardIntent,
  } from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
  import { RootState } from '@app/Shared/Redux/ReduxStore';
  import { gridSpans } from '@patternfly/react-core';
import { GripVerticalIcon } from '@patternfly/react-icons';
  import _ from 'lodash';
  import React from 'react';
  import { useDispatch, useSelector } from 'react-redux';
  import { DashboardCardSizes } from './Dashboard';
  import { DashboardCardContext } from './DashboardCard';

  function getDefaultBackground() {
    const div = document.createElement('div');
    document.head.appendChild(div);
    const bg = window.getComputedStyle(div).backgroundColor;
    document.head.removeChild(div);
    return bg;
  }
  
  function getInheritedBackgroundColor(el: HTMLElement): string {
    const defaultStyle = getDefaultBackground();
    const backgroundColor = window.getComputedStyle(el).backgroundColor;
  
    if (backgroundColor !== defaultStyle) {
      return backgroundColor;
    } else if (!el.parentElement) {
      return defaultStyle;
    }
  
    return getInheritedBackgroundColor(el.parentElement);
  }

  function overlaps(ev: MouseEvent, rect: DOMRect) {
    return (
      ev.clientX > rect.x && ev.clientX < rect.x + rect.width && ev.clientY > rect.y && ev.clientY < rect.y + rect.height
    );
  }

  const initStyle = {
    borderTop: '20px solid pink',
  };


  interface DroppableItem {
    node: HTMLElement;
    rect: DOMRect;
    isDraggingHost: boolean;
  }
  
  // Reset per-element state
  function resetDroppableItem(droppableItem: DroppableItem) {
    droppableItem.node.style.borderTop = initStyle.borderTop;
    droppableItem.node.style.paddingTop = initStyle.paddingTop;
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
    const cardConfigs: CardConfig[] = useSelector((state: RootState) => state.dashboardConfigs.list);
    const cardRef = React.useContext(DashboardCardContext);
    const dispatch = useDispatch();

    let [refStyle, setRefStyle] = React.useState<{}>(initStyle);
    /* eslint-enable prefer-const */
    const [isDragging, setIsDragging] = React.useState(false);
    const [isValidDrag, setIsValidDrag] = React.useState(true);
    // Some state is better just to leave as vars passed around between various callbacks
    // You can only drag around one item at a time anyways...
    let startX = 0;
    let startY = 0;
    let index: number; // Index of this draggable
    let hoveringDroppable: HTMLElement;
    let hoveringIndex: number;
    let mouseMoveListener: EventListener;
    let mouseUpListener: EventListener;
    // Makes it so dragging the _bottom_ of the item over the halfway of another moves it
    let startYOffset = 0;

    const onTransitionEnd = (_ev: React.TransitionEvent<HTMLElement>) => {
        if (isDragging) {
          setIsDragging(false);
          setRefStyle(initStyle);
        }
      };

    const onMouseUpWhileDragging = React.useCallback((droppableItems) => {
        droppableItems.forEach(resetDroppableItem);
        document.removeEventListener('mousemove', mouseMoveListener);
        document.removeEventListener('mouseup', mouseUpListener);
        document.removeEventListener('contextmenu', mouseUpListener);
        console.log(hoveringDroppable);
        

        if (hoveringDroppable) {
          console.log("HOVERING DROPPABLE:" + hoveringIndex);
          setIsDragging(false);
          dispatch(dashboardCardConfigReorderCardIntent(dashboardId, hoveringIndex))
        }
        else {
          setRefStyle({
            ...initStyle,
            transition: 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s',
            transform: '',
          });
        }


          
    }, [dispatch, setIsDragging, setRefStyle, isDragging, dashboardId]);

    const onMouseMoveWhileDragging = (ev: MouseEvent, draggableItems: DroppableItem[], blankDivRect: DOMRect) => {
        hoveringDroppable = null;
        draggableItems.forEach((draggableItem) => {
            if(overlaps(ev, draggableItem.rect) && !draggableItem.isDraggingHost) {
                draggableItem.node.style.borderTop = '20px solid purple';
                hoveringDroppable = draggableItem.node;
                hoveringIndex = parseInt(draggableItem.node.getAttribute('dashboard-card-order') as string);
                
            } else {
                resetDroppableItem(draggableItem);
            }
        });
        setRefStyle({
            ...refStyle,
            transform: `translate(${ev.pageX - startX}px, ${ev.pageY - startY}px)`
          });
        // hoveringIndex = null;
        // if (hoveringDroppable) {
        //     draggableItems.forEach((n, i) => {
        //         n.node.style.transition = 'transform 0.5s cubic-bezier(0.2, 1, 0.1, 1) 0s';
        //         const parent = n.node.closest('div.pf-l-grid__item');
        //       });
        // }
    };

    const onDragStart = React.useCallback((ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        if (isDragging) {
            return;
        }
        const dragging = ev.target as HTMLElement;
        const rect = dragging.getBoundingClientRect();
        const draggableNodes = Array.from(document.querySelectorAll('div.draggable-ref'));
        const draggableItems = draggableNodes.reduce((acc: any[], cur) => {
            const isDraggingHost = cur.contains(dragging);
            if (isDraggingHost) {
              index = draggableNodes.indexOf(dragging);
            }
            const droppableItem = {
              node: cur,
              rect: cur.getBoundingClientRect(),
              isDraggingHost,
              draggableNodes: draggableNodes.map(node => (node === dragging ? node.cloneNode(false) : node)),
              draggableNodesRects: draggableNodes.map(node => node.getBoundingClientRect())
            };
            acc.push(droppableItem);
            return acc;
        }, []);

        // Set initial style so future style mods take effect
        refStyle = {
            ...refStyle,
            borderTop: '5px dashed #8a8d90',
            top: rect.y,
            left: rect.x,
            width: rect.width,
            height: rect.height,
            position: 'fixed',
            zIndex: 5000
        } as any;
        setRefStyle(refStyle);
        // Store event details
        startX = ev.pageX;
        startY = ev.pageY;
        startYOffset = startY - rect.y;
        setIsDragging(true);
        mouseMoveListener = ev => onMouseMoveWhileDragging(ev as MouseEvent, draggableItems, rect);
        mouseUpListener = () => onMouseUpWhileDragging(draggableItems);
        document.addEventListener('mousemove', mouseMoveListener);
        document.addEventListener('mouseup', mouseUpListener);

    }, [setRefStyle, setIsDragging, isDragging]);

    const variableAttribute = React.useMemo(() =>  
        {
            return {['dashboard-card-order']: dashboardId};
        }
    , [dashboardId]);

    return (
        <div className={`draggable-ref${isDragging ? ' dragging' : ''}`}
            {...variableAttribute}
            draggable
            onDragStart={onDragStart} 
            onTransitionEnd={onTransitionEnd}
            style={{ ...refStyle}}
        >
          <div className="draggable-ref__content">
            {children}
          </div>
        </div>
    );
  };
  