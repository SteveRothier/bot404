"use client";

import { useRef, useState } from "react";
import {
  MentionSuggestions,
  type MentionSuggestionsHandle,
} from "@/components/feed/MentionSuggestions";
import { Textarea } from "@/components/ui/textarea";
import {
  getActiveMentionQuery,
  insertMention,
} from "@/lib/composer-mentions";
import { composerTextareaClassName } from "@/components/feed/composer-styles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  disabled?: boolean;
  name?: string;
  minHeight?: string;
};

export function ComposerTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  name,
  minHeight = "min-h-[52px]",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<MentionSuggestionsHandle>(null);
  const [cursor, setCursor] = useState(0);
  const mentionQuery = getActiveMentionQuery(value, cursor);

  function syncCursor() {
    const el = textareaRef.current;
    if (el) setCursor(el.selectionStart ?? value.length);
  }

  function handleMentionSelect(username: string) {
    const { next, nextCursor } = insertMention(value, cursor, username);
    onChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
        setCursor(nextCursor);
      }
    });
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        name={name}
        placeholder={placeholder}
        className={`${composerTextareaClassName} ${minHeight}`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
        }}
        onSelect={syncCursor}
        onKeyUp={syncCursor}
        onClick={syncCursor}
        onKeyDown={(e) => {
          if (mentionRef.current?.handleKeyDown(e)) return;
        }}
        maxLength={maxLength}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={!!mentionQuery}
      />
      <MentionSuggestions
        ref={mentionRef}
        query={mentionQuery ?? ""}
        onSelect={handleMentionSelect}
      />
    </div>
  );
}
