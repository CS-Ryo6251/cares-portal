// Auth redirects must stay on this site, including when supplied in a URL.
export function safeAuthRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return '/'
  const url = new URL(value, 'https://cares.invalid')
  if (url.origin !== 'https://cares.invalid' || ['/login', '/signup'].includes(url.pathname)) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}
