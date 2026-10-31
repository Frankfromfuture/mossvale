// Small ink drawings for spoken actions, independent of the town's prop atlas.
const drawings={
 voice:`<path d="M12 7c0-5 8-5 8 0v9c0 5-8 5-8 0Z" fill="#d9dfc7"/><path d="M8 14v2c0 10 16 10 16 0v-2M16 24v5M11 29h10M14 8h4M14 12h4"/>`,
 listen:`<path d="M5 18v-3a11 11 0 0 1 22 0v3M5 16H3v9h6v-9ZM27 16h2v9h-6v-9Z" fill="#d9dfc7"/><path d="M13 13v9M17 10v15M21 14v7"/>`,
 replay:`<path d="M4 12h6l8-7v22l-8-7H4Z" fill="#e5d8b9"/><path d="M22 11q5 5 0 10M25 7q9 9 0 18"/>`,
 say:`<path d="m11 7 12 9-12 9Z" fill="#d7bb84"/>`,
 evidence:`<path d="m8 5 14-1 4 5-1 19-18 1Z" fill="#efe1bc"/><path d="m21 4-1 6 6-1M11 14l10-.5M11 18h6"/><circle cx="20" cy="23" r="3" fill="#cad3b3"/>`,
 search:`<circle cx="13" cy="13" r="8" fill="#e3e6cf"/><path d="m19 19 9 9-3 2-8-10M9 10q2-3 5-2"/>`,
 private:`<path d="M5 5h18q4 0 4 4v9q0 4-4 4h-9l-6 5 1-5H5q-3 0-3-4V9q0-4 3-4Z" fill="#e2e6cd"/><path d="M9 12h11M9 16h7M29 12v9q0 4-5 5h-5"/>`,
 people:`<path d="M3 27v-4q0-6 8-6t8 6v4Z" fill="#e8d9bd"/><circle cx="11" cy="9" r="5" fill="#efe3ca"/><path d="M22 17q7 0 7 7v3h-6M20 5q7-1 7 5t-6 5"/>`,
 notes:`<path d="M7 4h19l-1 25H6Z" fill="#dbe1c8"/><path d="M10 4 9 29M18 4v10l3-2 3 2V4M3 9h5M3 15h5M3 22h5M13 21h7M13 25h5"/>`
};
export function dialogueGlyph(name){
 return `<svg class="dialogue-glyph dialogue-glyph-${name}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g filter="url(#crayon-outline)">${drawings[name]||drawings.notes}</g></svg>`;
}
