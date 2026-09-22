import { sanitizeHtml } from '../src/lib/utils/content';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ ' + message);
    process.exit(1);
  }
  console.log('✅ ' + message);
}

const xssPayload = `
<div class="test">
  <h2>Hello</h2>
  <img src="valid.jpg" />
  <script>alert("XSS")</script>
  <img src="x" onerror="alert('XSS')" />
  <a href="javascript:alert(1)">Click me</a>
</div>
`;

const sanitized = sanitizeHtml(xssPayload, 'Test Title', 'test');

console.log('Sanitized output:', sanitized);

assert(!sanitized.includes('<script>'), 'Script tag should be removed');
assert(!sanitized.includes('alert('), 'Alert should be removed');
assert(!sanitized.includes('javascript:'), 'javascript: href should be removed');
assert(sanitized.includes('src="valid.jpg"'), 'Valid image should remain');
assert(sanitized.includes('onerror="this.onerror=null;this.src='), 'Safe fallback onerror should be added');

console.log('All tests passed!');
