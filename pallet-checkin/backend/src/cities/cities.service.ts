import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const IBGE_MUNICIPIOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

// The shape actually returned by IBGE's API — only the fields this service
// reads are declared. `microrregiao` is the shortest reliable path down to
// the state (UF); `regiao-imediata` also carries a UF but nested one level
// deeper for no benefit here.
interface IbgeMunicipio {
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
}

// Lazy-fetched on first request and cached in-process for 24h — this
// dataset (Brazil's ~5570 municipalities) barely ever changes, and IBGE's
// own response already advertises a 30-day Cache-Control, so refetching it
// on every /cities call (or worse, every autocomplete keystroke) would be
// pure waste. Chosen over a fetch-at-startup approach so a transient IBGE
// outage at boot time can't block the app from starting — the first
// /cities call after boot just pays the fetch cost once.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CitiesService {
  private readonly logger = new Logger(CitiesService.name);
  private cache: string[] | null = null;
  private cachedAt = 0;

  async findAll(): Promise<string[]> {
    const isStale = Date.now() - this.cachedAt > CACHE_TTL_MS;
    if (this.cache && !isStale) {
      return this.cache;
    }

    try {
      const response = await fetch(IBGE_MUNICIPIOS_URL);
      if (!response.ok) {
        throw new Error(`IBGE responded with status ${response.status}`);
      }
      const municipios = (await response.json()) as IbgeMunicipio[];

      this.cache = municipios
        .map((municipio) => {
          const uf = municipio.microrregiao?.mesorregiao?.UF?.sigla;
          return uf ? `${municipio.nome} - ${uf}` : null;
        })
        .filter((entry): entry is string => entry !== null)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      this.cachedAt = Date.now();
    } catch (err) {
      // Serve a still-cached (if stale) list rather than fail outright —
      // a day-old municipality list is harmless; an empty Cidade
      // autocomplete because IBGE hiccuped is a worse failure mode.
      this.logger.error(`Failed to fetch municipality list from IBGE: ${(err as Error).message}`);
      if (this.cache) {
        return this.cache;
      }
      throw new ServiceUnavailableException('Could not fetch municipality data from IBGE');
    }

    return this.cache;
  }
}
