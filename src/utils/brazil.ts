export const BRAZIL_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
] as const;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calculateDigit = (baseLength: 12 | 13) => {
    const weights =
      baseLength === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const sum = weights.reduce(
      (total, weight, index) => total + Number(cnpj[index]) * weight,
      0,
    );

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    calculateDigit(12) === Number(cnpj[12]) &&
    calculateDigit(13) === Number(cnpj[13])
  );
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export interface CepLookupResult {
  city: string;
  state: string;
  district: string;
  street: string;
}

export async function lookupCep(value: string): Promise<CepLookupResult> {
  const cep = onlyDigits(value);

  if (cep.length !== 8) {
    throw new Error("Informe um CEP com 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP agora.");
  }

  const payload = (await response.json()) as {
    erro?: boolean;
    localidade?: string;
    uf?: string;
    bairro?: string;
    logradouro?: string;
  };

  if (payload.erro) {
    throw new Error("CEP não encontrado.");
  }

  return {
    city: payload.localidade?.trim() ?? "",
    state: payload.uf?.trim().toUpperCase() ?? "",
    district: payload.bairro?.trim() ?? "",
    street: payload.logradouro?.trim() ?? "",
  };
}

export async function getCitiesByState(stateCode: string): Promise<string[]> {
  const state = stateCode.trim().toUpperCase();

  if (!BRAZIL_STATES.some((item) => item.code === state)) {
    return [];
  }

  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`,
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar as cidades agora.");
  }

  const payload = (await response.json()) as Array<{ nome?: string }>;

  return payload
    .map((city) => city.nome?.trim() ?? "")
    .filter((city): city is string => Boolean(city));
}
