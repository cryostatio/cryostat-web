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
import { PopperOptions } from 'popper.js';
import * as React from 'react';
import './spotlight.css';
import Popper from './popper/Popper';

type InteractiveSpotlightProps = {
  element: Element;
};

const isInViewport = (elementToCheck: Element) => {
  const rect = elementToCheck.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

const popperOptions: PopperOptions = {
  modifiers: {
    preventOverflow: {
      enabled: false,
    },
    flip: {
      enabled: false,
    },
  },
};

const InteractiveSpotlight: React.FC<InteractiveSpotlightProps> = ({ element }) => {
  const { height, width } = element.getBoundingClientRect();
  const style: React.CSSProperties = {
    height,
    width,
  };
  const [clicked, setClicked] = React.useState(false);

  React.useEffect(() => {
    if (!clicked) {
      if (!isInViewport(element)) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      const handleClick = () => setClicked(true);
      document.addEventListener('click', handleClick);
      return () => {
        document.removeEventListener('click', handleClick);
      };
    }
    return () => {};
  }, [element, clicked]);

  if (clicked) return null;

  return (
    <Popper reference={element} placement="top-start" popperOptions={popperOptions}>
      <div className="ocs-spotlight ocs-spotlight__element-highlight-animate" style={style} />
    </Popper>
  );
};

export default InteractiveSpotlight;
