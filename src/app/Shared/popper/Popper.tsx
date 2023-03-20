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
import PopperJS, { PopperOptions } from 'popper.js';
import * as React from 'react';
import Portal from './Portal';

export const useCombineRefs = <RefType extends any>(...refs: (React.Ref<RefType> | undefined)[]) =>
  React.useCallback(
    (element: RefType | null): void =>
      refs.forEach((ref) => {
        if (ref) {
          if (typeof ref === 'function') {
            ref(element);
          } else {
            (ref as React.MutableRefObject<any>).current = element;
          }
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  );

// alignment with PopperJS reference API
type PopperJSReference = {
  getBoundingClientRect: PopperJS['reference']['getBoundingClientRect'];
  clientWidth: number;
  clientHeight: number;
};

type ClientRectProp = { x: number; y: number; width?: number; height?: number };

type Reference = Element | PopperJSReference | ClientRectProp;

class VirtualReference implements PopperJSReference {
  private rect: ClientRect;

  constructor({ height = 0, width = 0, x, y }: ClientRectProp) {
    this.rect = {
      bottom: y + height,
      height,
      left: x,
      right: x + width,
      top: y,
      width,
    };
  }

  getBoundingClientRect(): ClientRect {
    return this.rect;
  }

  get clientWidth(): number {
    return this.rect.width || 0;
  }

  get clientHeight(): number {
    return this.rect.height || 0;
  }
}

const getReference = (reference: Reference): PopperJSReference =>
  'getBoundingClientRect' in reference ? reference : new VirtualReference(reference);

type PopperProps = {
  children: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnOutsideClick?: boolean;
  container?: React.ComponentProps<typeof Portal>['container'];
  className?: string;
  open?: boolean;
  onRequestClose?: (e?: MouseEvent) => void;
  placement?:
    | 'bottom-end'
    | 'bottom-start'
    | 'bottom'
    | 'left-end'
    | 'left-start'
    | 'left'
    | 'right-end'
    | 'right-start'
    | 'right'
    | 'top-end'
    | 'top-start'
    | 'top';
  popperOptions?: PopperOptions;
  popperRef?: React.Ref<PopperJS>;
  reference: Reference | (() => Reference);
  zIndex?: number;
  returnFocus?: boolean;
};

const DEFAULT_POPPER_OPTIONS: PopperOptions = {};

const Popper: React.FC<PopperProps> = ({
  children,
  container,
  className,
  open,
  placement = 'bottom-start',
  reference,
  popperOptions = DEFAULT_POPPER_OPTIONS,
  closeOnEsc,
  closeOnOutsideClick,
  onRequestClose,
  popperRef: popperRefIn,
  zIndex = 9999,
  returnFocus,
}) => {
  const controlled = typeof open === 'boolean';
  const openProp = controlled ? open || false : true;
  const nodeRef = React.useRef<Element>();
  const popperRef = React.useRef<PopperJS>(null);
  const popperRefs = useCombineRefs<PopperJS>(popperRef, popperRefIn);
  const [isOpen, setOpenState] = React.useState(openProp);
  const focusRef = React.useRef<Element | null>();
  const onRequestCloseRef = React.useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (returnFocus && newOpen !== isOpen) {
        if (newOpen) {
          if (document.activeElement) {
            focusRef.current = document.activeElement;
          }
        } else if (focusRef.current instanceof HTMLElement && focusRef.current.ownerDocument) {
          focusRef.current.focus();
        }
      }
      setOpenState(newOpen);
    },
    [returnFocus, isOpen]
  );

  React.useEffect(() => {
    setOpen(openProp);
  }, [openProp, setOpen]);

  const onKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.keyCode === 27) {
        controlled ? onRequestCloseRef.current && onRequestCloseRef.current() : setOpen(false);
      }
    },
    [controlled, setOpen]
  );

  const onClickOutside = React.useCallback(
    (e: MouseEvent) => {
      if (!nodeRef.current || (e.target instanceof Node && !nodeRef.current.contains(e.target))) {
        controlled ? onRequestCloseRef.current && onRequestCloseRef.current(e) : setOpen(false);
      }
    },
    [controlled, setOpen]
  );

  const destroy = React.useCallback(() => {
    if (popperRef.current) {
      popperRef.current.destroy();
      popperRefs(null);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onClickOutside, true);
      document.removeEventListener('touchstart', onClickOutside, true);
    }
  }, [onClickOutside, onKeyDown, popperRefs]);

  const initialize = React.useCallback(() => {
    if (!nodeRef.current || !reference || !isOpen) {
      return;
    }

    destroy();

    popperRefs(
      new PopperJS(getReference(typeof reference === 'function' ? reference() : reference), nodeRef.current, {
        placement,
        ...popperOptions,
        modifiers: {
          preventOverflow: {
            boundariesElement: 'window',
          },
          ...popperOptions.modifiers,
        },
      })
    );

    // init document listenerrs
    if (closeOnEsc) {
      document.addEventListener('keydown', onKeyDown, true);
    }
    if (closeOnOutsideClick) {
      document.addEventListener('mousedown', onClickOutside, true);
      document.addEventListener('touchstart', onClickOutside, true);
    }
  }, [
    popperRefs,
    reference,
    isOpen,
    destroy,
    placement,
    popperOptions,
    closeOnEsc,
    closeOnOutsideClick,
    onKeyDown,
    onClickOutside,
  ]);

  const nodeRefCallback = React.useCallback(
    (node) => {
      nodeRef.current = node;
      initialize();
    },
    [initialize]
  );

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  React.useEffect(() => {
    if (!isOpen) {
      destroy();
    }
  }, [destroy, isOpen]);

  return isOpen ? (
    <Portal container={container}>
      <div ref={nodeRefCallback} className={className} style={{ zIndex, position: 'absolute', top: 0, left: 0 }}>
        {children}
      </div>
    </Portal>
  ) : null;
};

export default Popper;
