import React from 'react';
import ReactDOM from 'react-dom';

export interface FocusedElementProps {
    children: React.ReactNode;
}

export const FocusedElement: React.FC<FocusedElementProps> = (props) => {
    const mount = document.getElementById("portal-root") as HTMLElement;
    const el = document.createElement("div");
  
    React.useEffect(() => {
      mount.appendChild(el);
      return () => {
        mount.removeChild(el);
      }
    }, [el, mount]);
  
    return ReactDOM.createPortal(props.children, el);
}