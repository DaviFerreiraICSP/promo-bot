/**
 * Utilitário para descurtar links e resolver redirecionamentos (ex: amzn.to, shope.ee, bit.ly)
 */
export async function resolveRedirect(url: string, maxRedirects: number = 5): Promise<string> {
  let currentUrl = url;

  // Otimização direta para Pelando (payload base64 no token)
  if (currentUrl.includes('dpl.pelando.com.br/r/')) {
    try {
      const token = currentUrl.split('/r/')[1]?.split('?')[0];
      const parts = token?.split('.');
      if (parts && parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload.url) {
          return payload.url;
        }
      }
    } catch {
      // continua para resolução HTTP normal se falhar o parse
    }
  }

  try {
    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // Cancela o download do corpo para economizar memória e largura de banda
    response.body?.cancel().catch(() => {});

    return response.url || currentUrl;
  } catch {
    return currentUrl;
  }
}
