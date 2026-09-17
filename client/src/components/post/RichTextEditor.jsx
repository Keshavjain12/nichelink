import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useEffect, useRef } from 'react';

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean'],
];

const FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'code-block',
  'list',
  'link',
];

/**
 * Thin wrapper around Quill 2. Emits semantic HTML (sanitized again on the server) plus plain text
 * for validation. `initialValue` is only read on mount; Quill owns the document afterwards.
 */
export default function RichTextEditor({
  id,
  initialValue = '',
  onChange,
  placeholder,
  ariaLabel,
  invalid,
}) {
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const container = containerRef.current;
    const editorElement = container.appendChild(document.createElement('div'));
    const quill = new Quill(editorElement, {
      theme: 'snow',
      placeholder,
      formats: FORMATS,
      modules: { toolbar: TOOLBAR, clipboard: {} },
    });

    if (initialValueRef.current) {
      quill.clipboard.dangerouslyPasteHTML(initialValueRef.current, 'silent');
    }

    quill.root.id = id;
    quill.root.setAttribute('role', 'textbox');
    quill.root.setAttribute('aria-multiline', 'true');
    if (ariaLabel) quill.root.setAttribute('aria-label', ariaLabel);

    quill.on('text-change', () => {
      const text = quill.getText().trim();
      const html = text ? quill.getSemanticHTML().replace(/&nbsp;/g, ' ') : '';
      onChangeRef.current?.(html, text);
    });

    return () => {
      container.innerHTML = '';
    };
  }, [id, placeholder, ariaLabel]);

  useEffect(() => {
    const root = containerRef.current?.querySelector('.ql-editor');
    if (root) root.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }, [invalid]);

  return <div ref={containerRef} className="rich-editor" />;
}
