import { XMLParser } from 'fast-xml-parser';

export interface NFeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface NFeSupplier {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  ie: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export interface NFeData {
  numero: string;
  serie: string;
  dataEmissao: string;
  chaveAcesso: string;
  fornecedor: NFeSupplier;
  itens: NFeItem[];
  totais: {
    valorProdutos: number;
    valorFrete: number;
    valorDesconto: number;
    valorNF: number;
  };
}

// Códigos de status SEFAZ que autorizam a NF-e a ser usada
const CSTAT_AUTORIZADO = new Set(['100', '150']);

export function parseNFeXML(xmlString: string): NFeData {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('XML vazio ou inválido.');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const jsonObj = parser.parse(xmlString);

  const findNestedKey = (obj: any, targetKey: string): any => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[targetKey] !== undefined) return obj[targetKey];

    const keys = Object.keys(obj);
    for (const key of keys) {
      const cleanKey = key.includes(':') ? key.split(':').pop() : key;
      if (cleanKey?.toLowerCase() === targetKey.toLowerCase()) {
        return obj[key];
      }
    }

    for (const key of keys) {
      if (typeof obj[key] === 'object') {
        const found = findNestedKey(obj[key], targetKey);
        if (found) return found;
      }
    }
    return null;
  };

  const nfe = findNestedKey(jsonObj, 'infNFe');
  const prot = findNestedKey(jsonObj, 'infProt') || findNestedKey(jsonObj, 'protNFe');

  if (!nfe) {
    throw new Error('Formato de XML de NF-e inválido ou não reconhecido.');
  }

  // A03: validar cStat se o protocolo estiver presente.
  // NF-e não autorizada (cancelada, denegada, em processamento) NÃO deve ser importada.
  if (prot) {
    const rawCStat = findNestedKey(prot, 'cStat');
    const cStat = rawCStat !== null && rawCStat !== undefined ? String(rawCStat).trim() : null;

    if (cStat && !CSTAT_AUTORIZADO.has(cStat)) {
      const rawMotivo = findNestedKey(prot, 'xMotivo');
      const motivo = rawMotivo ? String(rawMotivo).trim() : 'sem motivo informado';
      throw new Error(
        `NF-e não está autorizada pela SEFAZ (cStat=${cStat}: ${motivo}). Importação bloqueada.`
      );
    }
  }

  const ide = findNestedKey(nfe, 'ide') || {};
  const emit = findNestedKey(nfe, 'emit');
  const total = findNestedKey(nfe, 'ICMSTot') || findNestedKey(nfe, 'total') || {};

  const det = findNestedKey(nfe, 'det');
  if (!det) {
    throw new Error('Nenhum item de produto cadastrado foi localizado na NF-e.');
  }
  const detArray = Array.isArray(det) ? det : [det];

  const itens: NFeItem[] = detArray.map((item: any, idx: number) => {
    const prod = findNestedKey(item, 'prod') || item.prod || {};

    const rawCodigo = findNestedKey(prod, 'cProd') || prod.cProd;
    const rawDescricao = findNestedKey(prod, 'xProd') || prod.xProd;
    const rawNcm = findNestedKey(prod, 'NCM') || prod.NCM;
    const rawQuantidade = findNestedKey(prod, 'qCom') || prod.qCom;
    const rawUnidade = findNestedKey(prod, 'uCom') || prod.uCom;
    const rawValorUnitario = findNestedKey(prod, 'vUnCom') || prod.vUnCom;
    const rawValorTotal = findNestedKey(prod, 'vProd') || prod.vProd;

    // A03: exigir código e descrição. Não inventar.
    if (!rawCodigo || String(rawCodigo).trim() === '') {
      throw new Error(
        `Item #${idx + 1} da NF-e não possui código (cProd). Importação bloqueada.`
      );
    }
    if (!rawDescricao || String(rawDescricao).trim() === '') {
      throw new Error(
        `Item #${idx + 1} da NF-e não possui descrição (xProd). Importação bloqueada.`
      );
    }

    const codigo = String(rawCodigo).trim();
    const descricao = String(rawDescricao).trim().toUpperCase();
    const ncm = rawNcm ? String(rawNcm).trim() : '';
    const unidade = rawUnidade ? String(rawUnidade).trim().toUpperCase() : 'UN';

    // A03: quantidade precisa ser número positivo. Sem fallback para 1.
    const parsedQtd = Number(rawQuantidade);
    if (!rawQuantidade || isNaN(parsedQtd) || parsedQtd <= 0) {
      throw new Error(
        `Item "${descricao}" tem quantidade inválida (qCom=${rawQuantidade}). Importação bloqueada.`
      );
    }
    const quantidade = parsedQtd;

    const parsedVUn = Number(rawValorUnitario);
    if (!rawValorUnitario || isNaN(parsedVUn) || parsedVUn < 0) {
      throw new Error(
        `Item "${descricao}" tem valor unitário inválido (vUnCom=${rawValorUnitario}). Importação bloqueada.`
      );
    }
    const valorUnitario = parsedVUn;

    // A03: valor total — usa vProd se disponível, senão calcula. Sem aceitar "0 silencioso".
    const parsedVProd = Number(rawValorTotal);
    const valorTotal =
      rawValorTotal !== undefined && !isNaN(parsedVProd) && parsedVProd >= 0
        ? parsedVProd
        : quantidade * valorUnitario;

    return {
      codigo,
      descricao,
      ncm,
      quantidade,
      unidade,
      valorUnitario,
      valorTotal,
    };
  });

  if (!emit) {
    throw new Error('Dados do emitente/fornecedor não foram configurados no XML.');
  }

  const enderEmit = findNestedKey(emit, 'enderEmit') || {};

  const rawCnpj = findNestedKey(emit, 'CNPJ') || findNestedKey(emit, 'CPF') || emit.CNPJ || emit.CPF;
  const cnpj = String(rawCnpj || '').replace(/\D/g, '').trim();
  if (!cnpj) {
    throw new Error('CNPJ ou CPF do emitente não identificado no arquivo XML.');
  }

  const rawRazaoSocial = findNestedKey(emit, 'xNome') || emit.xNome;
  if (!rawRazaoSocial || String(rawRazaoSocial).trim() === '') {
    throw new Error('Razão social do emitente (xNome) não informada na NF-e.');
  }

  const rawNomeFantasia = findNestedKey(emit, 'xFant') || emit.xFant;
  const rawIe = findNestedKey(emit, 'IE') || emit.IE;

  const fornecedor: NFeSupplier = {
    cnpj,
    razaoSocial: String(rawRazaoSocial).trim().toUpperCase(),
    nomeFantasia: rawNomeFantasia ? String(rawNomeFantasia).trim().toUpperCase() : undefined,
    ie: rawIe ? String(rawIe).trim() : 'ISENTO',
    endereco: findNestedKey(enderEmit, 'xLgr')
      ? `${String(findNestedKey(enderEmit, 'xLgr')).trim()}, ${String(findNestedKey(enderEmit, 'nro') || '').trim()}`.toUpperCase()
      : undefined,
    bairro: findNestedKey(enderEmit, 'xBairro') ? String(findNestedKey(enderEmit, 'xBairro')).trim().toUpperCase() : undefined,
    cidade: findNestedKey(enderEmit, 'xMun') ? String(findNestedKey(enderEmit, 'xMun')).trim().toUpperCase() : undefined,
    uf: findNestedKey(enderEmit, 'UF') ? String(findNestedKey(enderEmit, 'UF')).trim().toUpperCase() : undefined,
    cep: findNestedKey(enderEmit, 'CEP') ? String(findNestedKey(enderEmit, 'CEP')).trim().replace(/\D/g, '') : undefined,
  };

  // A03: chave de acesso correta vem do atributo `Id` do infNFe (formato "NFe<44 dígitos>").
  // Fallback para <chNFe> do protocolo quando o Id estiver ausente.
  let chaveAcesso = '';
  const rawId = nfe['@_Id'] || nfe.Id || (nfe as any)['@_id'];
  if (rawId) {
    const limpo = String(rawId).replace(/^NFe/i, '').replace(/\D/g, '');
    if (limpo.length === 44) chaveAcesso = limpo;
  }
  if (!chaveAcesso && prot) {
    const rawCh = findNestedKey(prot, 'chNFe');
    if (rawCh) {
      const limpo = String(rawCh).replace(/\D/g, '');
      if (limpo.length === 44) chaveAcesso = limpo;
    }
  }
  if (!chaveAcesso) {
    throw new Error('Chave de acesso da NF-e não encontrada no XML. Importação bloqueada.');
  }

  const rawNumero = findNestedKey(ide, 'nNF') || ide.nNF;
  if (!rawNumero) {
    throw new Error('Número da NF-e (nNF) não informado.');
  }
  const numero = String(rawNumero).trim();

  const rawSerie = findNestedKey(ide, 'serie') || ide.serie;
  const serie = rawSerie ? String(rawSerie).trim() : '1';

  const rawDataEmissao = findNestedKey(ide, 'dhEmi') || findNestedKey(ide, 'dEmi') || ide.dhEmi || ide.dEmi;
  if (!rawDataEmissao) {
    throw new Error('Data de emissão (dhEmi/dEmi) não informada na NF-e.');
  }
  const dataEmissao = String(rawDataEmissao);

  const valorProdutos = Number(findNestedKey(total, 'vProd') || total.vProd || 0);
  const valorFrete = Number(
    findNestedKey(total, 'vFrete') ||
    findNestedKey(total, 'vOutro') ||
    total.vFrete ||
    total.vOutro ||
    0
  );
  const valorDesconto = Number(findNestedKey(total, 'vDesc') || total.vDesc || 0);
  let valorNF = Number(findNestedKey(total, 'vNF') || total.vNF || 0);

  if (valorNF === 0) {
    valorNF = itens.reduce((sum, item) => sum + item.valorTotal, 0);
  }

  return {
    numero,
    serie,
    dataEmissao,
    chaveAcesso,
    fornecedor,
    itens,
    totais: {
      valorProdutos,
      valorFrete,
      valorDesconto,
      valorNF,
    },
  };
}
