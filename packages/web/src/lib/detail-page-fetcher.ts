// Temporary fallback version without cheerio due to dependency issues
// This will provide mock data until cheerio can be properly installed

export interface DetailContent {
  fullDescription: string
  specifications: Record<string, string>
  features: string[]
  images: string[]
  pricing: {
    currentPrice?: string
    originalPrice?: string
    currency: string
    availability: string
    shippingInfo?: string
  }
  retailer: {
    name: string
    logo?: string
    url: string
  }
  additionalContent: string
}

export class DetailPageFetcher {
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      console.error('Error fetching page:', error)
      throw error
    }
  }

  async fetchDetailContent(dealUrl: string): Promise<DetailContent> {
    try {
      console.log(`🔍 Fetching detail content for URL: ${dealUrl}`)

      // For now, return enhanced mock data based on the URL
      const domain = new URL(dealUrl).hostname.toLowerCase()

      // Fetch the page to get basic HTML content
      const html = await this.fetchPage(dealUrl)

      return this.generateMockDetailContent(dealUrl, domain, html)
    } catch (error) {
      console.error('Error parsing detail page:', error)
      return this.getEmptyDetailContent(dealUrl)
    }
  }

  private generateMockDetailContent(url: string, domain: string, html: string): DetailContent {
    // Extract basic info from HTML using simple string methods
    const title = this.extractTitle(html)
    const description = this.extractBasicDescription(html)

    let retailerName = 'Unknown'
    let retailerLogo = undefined

    if (domain.includes('amazon')) {
      retailerName = 'Amazon'
      retailerLogo = 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg'
    } else if (domain.includes('mediamarkt')) {
      retailerName = 'MediaMarkt'
      retailerLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/MediaMarkt_logo.svg/200px-MediaMarkt_logo.svg.png'
    } else if (domain.includes('otto')) {
      retailerName = 'Otto'
      retailerLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Otto_logo.svg/200px-Otto_logo.svg.png'
    } else if (domain.includes('ebay')) {
      retailerName = 'eBay'
      retailerLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/200px-EBay_logo.svg.png'
    } else if (domain.includes('sparhamster')) {
      retailerName = 'Sparhamster.at'
    } else {
      retailerName = domain.replace('www.', '').split('.')[0].toUpperCase()
    }

    return {
      fullDescription: description || `Dieses Produkt von ${retailerName} bietet hervorragende Qualität zu einem attraktiven Preis. Weitere Details finden Sie direkt auf der Produktseite.`,
      specifications: {
        'Marke': retailerName,
        'Verfügbarkeit': 'Auf Lager',
        'Versand': 'Kostenloser Versand verfügbar',
        'Garantie': '2 Jahre Herstellergarantie',
        'Bewertung': '4.5 von 5 Sternen'
      },
      features: [
        'Hochwertige Materialien und Verarbeitung',
        'Benutzerfreundliches Design',
        'Ausgezeichnetes Preis-Leistungs-Verhältnis',
        'Schnelle und zuverlässige Lieferung',
        'Kundenservice und Support verfügbar'
      ],
      images: [
        // Placeholder images - in real implementation would extract from HTML
        'https://via.placeholder.com/500x500/e0e0e0/666666?text=Produktbild+1',
        'https://via.placeholder.com/500x500/f0f0f0/777777?text=Produktbild+2',
        'https://via.placeholder.com/500x500/e8e8e8/888888?text=Produktbild+3'
      ],
      pricing: {
        currentPrice: 'Siehe Website',
        currency: 'EUR',
        availability: 'Auf Lager',
        shippingInfo: 'Kostenloser Versand verfügbar'
      },
      retailer: {
        name: retailerName,
        logo: retailerLogo,
        url: url
      },
      additionalContent: `Detaillierte Produktinformationen sind verfügbar auf ${retailerName}. Bitte besuchen Sie die Originalseite für die neuesten Preise und Verfügbarkeit.`
    }
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    return titleMatch ? titleMatch[1].trim() : ''
  }

  private extractBasicDescription(html: string): string {
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i)
    if (descMatch) {
      return descMatch[1].trim()
    }

    // Fallback: try to extract first paragraph
    const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i)
    if (pMatch) {
      return pMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 200) + '...'
    }

    return ''
  }

  private getEmptyDetailContent(url: string): DetailContent {
    const domain = new URL(url).hostname.toLowerCase()
    const retailerName = domain.replace('www.', '').split('.')[0].toUpperCase()

    return {
      fullDescription: 'Produktdetails sind vorübergehend nicht verfügbar.',
      specifications: {},
      features: [],
      images: [],
      pricing: {
        currency: 'EUR',
        availability: 'Unbekannt'
      },
      retailer: {
        name: retailerName,
        url: url
      },
      additionalContent: 'Bitte besuchen Sie die Originalseite für weitere Informationen.'
    }
  }
}

// Export singleton instance
export const detailPageFetcher = new DetailPageFetcher()