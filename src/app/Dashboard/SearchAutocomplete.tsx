/*
 * Copyright The Cryostat Authors.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { portalRoot } from '@app/utils/utils';
import { Menu, MenuContent, MenuItem, MenuList, Popper, SearchInput } from '@patternfly/react-core';
import React from 'react';

export interface SearchAutocompleteProps {
  values: string[];
  onChange: (value: string) => void;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({ onChange, ...props }) => {
  const [value, setValue] = React.useState('');
  const [hint, setHint] = React.useState('');
  const [autocompleteOptions, setAutocompleteOptions] = React.useState<JSX.Element[]>([]);

  const [isAutocompleteOpen, setIsAutocompleteOpen] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<HTMLDivElement>(null);

  const onClear = React.useCallback(() => {
    setValue('');
    onChange('');
  }, [setValue, onChange]);

  const onSearchChange = React.useCallback(
    (newValue) => {
      if (newValue !== '' && searchInputRef.current && searchInputRef.current.contains(document.activeElement)) {
        // When the value of the search input changes, build a list of no more than 10 autocomplete options.
        let options = props.values
          .filter((option) => option.toLowerCase().startsWith(newValue.toLowerCase()))
          .map((option) => (
            <MenuItem itemId={option} key={option}>
              {option}
            </MenuItem>
          ));
        if (options.length > 10) {
          options = options.slice(0, 10);
        }
        // The hint is set whenever there is only one autocomplete option left.
        setHint(options.length === 1 ? newValue + options[0].props.itemId.substring(newValue.length) : '');
        // The menu is hidden if there are no options
        setIsAutocompleteOpen(options.length > 0);
        setAutocompleteOptions(options);
      } else {
        setIsAutocompleteOpen(false);
        setAutocompleteOptions([]);
        setHint('');
      }
      setValue(newValue);
      onChange(newValue);
    },
    [setValue, setHint, setIsAutocompleteOpen, setAutocompleteOptions, onChange, props.values]
  );

  // Whenever an autocomplete option is selected, set the search input value, close the menu, and put the browser
  // focus back on the search input
  const onSelect = React.useCallback(
    (e, itemId) => {
      e.stopPropagation();
      setValue(itemId);
      setHint('');
      setIsAutocompleteOpen(false);
      searchInputRef.current && searchInputRef.current.focus();
    },
    [setValue, setHint, setIsAutocompleteOpen]
  );

  const handleMenuKeys = React.useCallback(
    (event) => {
      // If there is a hint while the browser focus is on the search input, tab or right arrow will 'accept' the hint value
      // and set it as the search input value
      if (hint && (event.key === 'Tab' || event.key === 'ArrowRight') && searchInputRef.current === event.target) {
        setValue(hint);
        setHint('');
        setIsAutocompleteOpen(false);
        if (event.key === 'ArrowRight') {
          event.preventDefault();
        }
        // if the autocomplete is open and the browser focus is on the search input,
      } else if (isAutocompleteOpen && searchInputRef.current && searchInputRef.current === event.target) {
        // the escape key closes the autocomplete menu and keeps the focus on the search input.
        if (event.key === 'Escape') {
          setIsAutocompleteOpen(false);
          searchInputRef.current.focus();
          // the up and down arrow keys move browser focus into the autocomplete menu
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (autocompleteRef.current) {
            const firstElement = autocompleteRef.current.querySelector('li > button:not(:disabled)') as HTMLElement;
            firstElement && firstElement.focus();
          }
          event.preventDefault(); // by default, the up and down arrow keys scroll the window
          // the tab, enter, and space keys will close the menu, and the tab key will move browser
          // focus forward one element (by default)
        } else if (event.key === 'Tab' || event.key === 'Enter' || event.key === 'Space') {
          setIsAutocompleteOpen(false);
          if (event.key === 'Enter' || event.key === 'Space') {
            event.preventDefault();
          }
        }
        // If the autocomplete is open and the browser focus is in the autocomplete menu
        // hitting tab will close the autocomplete and but browser focus back on the search input.
      } else if (
        isAutocompleteOpen &&
        autocompleteRef.current &&
        autocompleteRef.current.contains(event.target) &&
        event.key === 'Tab'
      ) {
        event.preventDefault();
        setIsAutocompleteOpen(false);
        searchInputRef.current && searchInputRef.current.focus();
      }
    },
    [hint, isAutocompleteOpen]
  );

  // The autocomplete menu should close if the user clicks outside the menu.
  const handleClickOutside = React.useCallback(
    (event) => {
      if (isAutocompleteOpen && autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setIsAutocompleteOpen(false);
      }
    },
    [isAutocompleteOpen]
  );

  React.useEffect(() => {
    window.addEventListener('keydown', handleMenuKeys);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleMenuKeys);
      window.removeEventListener('click', handleMenuKeys);
    };
  }, [handleMenuKeys, handleClickOutside]);

  const searchInput = React.useMemo(
    () => (
      <SearchInput
        value={value}
        onChange={onSearchChange}
        onClear={onClear}
        ref={searchInputRef}
        hint={hint}
        id="cryostat-autocomplete-search"
      />
    ),
    [value, onSearchChange, onClear, hint]
  );

  const autocomplete = React.useMemo(
    () => (
      <Menu ref={autocompleteRef} onSelect={onSelect}>
        <MenuContent>
          <MenuList>{autocompleteOptions}</MenuList>
        </MenuContent>
      </Menu>
    ),
    [autocompleteOptions, onSelect]
  );

  return (
    <Popper
      trigger={searchInput}
      popper={autocomplete}
      isVisible={isAutocompleteOpen}
      enableFlip={false}
      // append the autocomplete menu to the search input in the DOM for the sake of the keyboard navigation experience
      appendTo={() => document.querySelector('#cryostat-autocomplete-search') || portalRoot}
    />
  );
};
