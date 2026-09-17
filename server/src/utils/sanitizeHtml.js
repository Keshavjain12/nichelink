import sanitizeHtml from 'sanitize-html';

/** Allowlist matching the formats enabled in the client's Quill toolbar. */
const RICH_TEXT_OPTIONS = Object.freeze({
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'h2',
    'h3',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'a',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    b: 'strong',
    i: 'em',
    strike: 's',
    h1: 'h2',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
    div: 'p',
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: { href: attribs.href ?? '', target: '_blank', rel: 'noopener noreferrer nofollow' },
    }),
  },
});

const ENTITIES = Object.freeze({
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
});

const decodeEntities = (text) =>
  text.replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (entity) => ENTITIES[entity]);

export function sanitizeRichText(html) {
  // Quill's semantic HTML encodes every space as &nbsp;, which prevents line wrapping.
  const normalized = html.replace(/&nbsp;|\xa0/g, ' ');
  return sanitizeHtml(normalized, RICH_TEXT_OPTIONS)
    .replace(/<p>\s*<\/p>/g, '')
    .trim();
}

export function htmlToPlainText(html) {
  const spaced = html.replace(/<(?:br\s*\/?|\/p|\/h[1-6]|\/li|\/blockquote|\/pre)>/gi, '$& ');
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} });
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}
