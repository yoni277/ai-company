'use client';

/**
 * D061 / P056.2.4 — SearchBar (shell)  [NEW-SVC — Wave 2]
 *
 * Input shell ONLY. Global cross-entity search is a Wave-2 service
 * (ticket P056-NS-3); this primitive ships the chrome so Home/Inbox have the
 * affordance, but it does not query anything yet. The optional `onSubmit`/
 * `onChange` let a future Wave-2 service wire in without a markup change.
 *
 * 40px input height (DESIGN.md §Inputs), logical padding for RTL, the search
 * glyph sits on the inline-start so it mirrors under `dir="rtl"`. Labelled for
 * screen readers even though the visual label is the placeholder.
 */

import { useId, useState, type FormEvent } from 'react';
import { SearchIcon } from './icons';

export function SearchBar({
  placeholder = 'Search decisions, risks, projects…',
  defaultValue = '',
  disabled = false,
  onChange,
  onSubmit,
}: {
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit?.(value);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search
      </label>
      <SearchIcon
        className="pointer-events-none absolute inset-y-0 start-md my-auto h-4 w-4 text-outline"
      />
      <input
        id={id}
        type="search"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e.target.value);
        }}
        className="h-10 w-full rounded border border-outline-variant bg-surface-container-lowest ps-[2.5rem] pe-md font-body-md text-body-md text-on-surface placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60"
      />
    </form>
  );
}
