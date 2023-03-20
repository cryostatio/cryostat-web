import { useCallback, useState } from "react";

// taken from streamich.github.io/react-use
const useSetState = <T extends object>(
    initialState: T = {} as T
  ): [T, (patch: Partial<T> | ((prevState: T) => Partial<T>)) => void] => {
    const [state, set] = useState<T>(initialState);
    const setState = useCallback((patch) => {
      set((prevState) =>
        Object.assign({}, prevState, patch instanceof Function ? patch(prevState) : patch)
      );
    }, []);
  
    return [state, setState];
};

export default useSetState;
  