/**
 * Utilitário para descurtar links e resolver redirecionamentos (ex: amzn.to, shope.ee, bit.ly)
 */
export async function resolveRedirect(url: string, maxRedirects: number = 5): Promise<string> {
  let currentUrl = url;
  let redirectsCount = 0;

  try {
    while (redirectsCount < maxRedirects) {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const location = response.headers.get('location');
      if (location && [301, 302, 303, 307, 308].includes(response.status)) {
        // Resolve URL relativa se necessário
        currentUrl = new URL(location, currentUrl).toString();
        redirectsCount++;
      } else {
        break;
      }
    }
  } catch (error) {
    // Se der erro no HEAD (alguns servidores bloqueiam HEAD), tenta GET rápido
    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      return response.url || currentUrl;
    } catch {
      return currentUrl;
    }
  }

  return currentUrl;
}
